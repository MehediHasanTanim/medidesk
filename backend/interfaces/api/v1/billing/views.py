import uuid

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.billing_dto import CreateInvoiceDTO, InvoiceItemDTO, RecordPaymentDTO
from application.use_cases.billing.cancel_invoice import CancelInvoiceUseCase
from application.use_cases.billing.create_invoice import CreateInvoiceUseCase
from application.use_cases.billing.record_payment import RecordPaymentUseCase
from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork
from infrastructure.services.audit_service import get_audit_service
from interfaces.api.v1.mixins import AuditMixin, _get_client_ip
from interfaces.permissions import ADMIN_ROLES, ModulePermission
from interfaces.api.v1.billing.serializers import (
    CreateInvoiceResponseSerializer,
    CreateInvoiceSerializer,
    InvoiceDetailSerializer,
    InvoiceSummarySerializer,
    RecordPaymentResponseSerializer,
    RecordPaymentSerializer,
    UpdateInvoiceSerializer,
)


# ── Views ─────────────────────────────────────────────────────────────────────

def _invoice_summary(inv) -> dict:
    return {
        "invoice_id": str(inv.id),
        "invoice_number": inv.invoice_number,
        "patient_id": str(inv.patient_id),
        "consultation_id": str(inv.consultation_id) if inv.consultation_id else None,
        "status": inv.status.value,
        "subtotal": str(inv.subtotal.amount),
        "discount_percent": str(inv.discount_percent),
        "total_due": str(inv.total_due.amount),
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
        "item_count": len(inv.items),
    }


@extend_schema(tags=["billing"])
class InvoiceView(AuditMixin, APIView):
    audit_resource_type = "invoice"
    # ModulePermission("billing") handles the outer gate:
    #   GET  → billing.view  (doctor, receptionist, assistant)
    #   POST → billing.create (receptionist, assistant only)
    # For GET ?consultation_id any billing.view role may proceed;
    # the ?patient_id branch additionally checks for billing-staff roles inline.
    permission_classes = [IsAuthenticated, ModulePermission("billing")]

    @extend_schema(
        summary="List invoices",
        description=(
            "Filter by **patient_id** to list all invoices for a patient (billing staff only), "
            "or by **consultation_id** to get the invoice linked to a specific consultation "
            "(any authenticated user — used to show billing status on the consultation page)."
        ),
        responses={200: InvoiceSummarySerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        consultation_id_str = request.query_params.get("consultation_id")
        patient_id_str = request.query_params.get("patient_id")

        if not consultation_id_str and not patient_id_str:
            return Response(
                {"error": "Provide patient_id or consultation_id query param"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── By consultation — any authenticated role ──────────────────────────
        if consultation_id_str:
            try:
                consultation_id = uuid.UUID(consultation_id_str)
            except ValueError:
                return Response({"error": "Invalid consultation_id"}, status=status.HTTP_400_BAD_REQUEST)

            with DjangoUnitOfWork() as uow:
                inv = uow.billing.get_invoice_by_consultation(consultation_id)

            return Response([_invoice_summary(inv)] if inv else [])

        # ── By patient — billing staff only ──────────────────────────────────
        role = getattr(request.user, "role", "")
        if role not in {"receptionist", "assistant"} | ADMIN_ROLES:
            return Response(
                {"error": "Only billing staff can list invoices by patient"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            patient_id = uuid.UUID(patient_id_str)  # type: ignore[arg-type]
        except ValueError:
            return Response({"error": "Invalid patient_id"}, status=status.HTTP_400_BAD_REQUEST)

        with DjangoUnitOfWork() as uow:
            invoices = uow.billing.get_invoices_by_patient(patient_id)

        return Response([_invoice_summary(inv) for inv in invoices])

    @extend_schema(
        summary="Create invoice",
        description=(
            "Create a new invoice for a patient. "
            "Optionally link it to a consultation via **consultation_id**. "
            "The invoice is immediately set to **issued** status. "
            "Billing staff only."
        ),
        request=CreateInvoiceSerializer,
        responses={201: CreateInvoiceResponseSerializer},
    )
    def post(self, request: Request) -> Response:
        # Class-level ModulePermission("billing") already enforces billing.create
        # (receptionist/assistant/admin only) before this method runs.
        serializer = CreateInvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        item_dtos = [
            InvoiceItemDTO(
                description=item["description"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
            )
            for item in data["items"]
        ]

        dto = CreateInvoiceDTO(
            patient_id=str(data["patient_id"]),
            consultation_id=str(data["consultation_id"]) if data.get("consultation_id") else None,
            items=item_dtos,
            discount_percent=data.get("discount_percent", 0),
            created_by_id=str(request.user.id),
        )

        try:
            result = CreateInvoiceUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["billing"])
class InvoiceDetailView(AuditMixin, APIView):
    audit_resource_type = "invoice"
    permission_classes = [IsAuthenticated, ModulePermission("billing")]

    @extend_schema(
        summary="Get invoice details",
        description="Returns full invoice with line items and all recorded payments.",
        responses={200: InvoiceDetailSerializer},
    )
    def get(self, request: Request, invoice_id: uuid.UUID) -> Response:
        with DjangoUnitOfWork() as uow:
            invoice = uow.billing.get_invoice_by_id(invoice_id)
            if not invoice:
                return Response(
                    {"error": "Invoice not found"}, status=status.HTTP_404_NOT_FOUND
                )
            payments = uow.billing.get_payments_by_invoice(invoice_id)

        get_audit_service().log(
            action="VIEW",
            resource_type="invoice",
            resource_id=str(invoice_id),
            user_id=request.user.id if request.user.is_authenticated else None,
            ip_address=_get_client_ip(request),
        )
        return Response({
            **_invoice_summary(invoice),
            "items": [
                {
                    "description": item.description,
                    "quantity": item.quantity,
                    "unit_price": str(item.unit_price.amount),
                    "total": str(item.total.amount),
                }
                for item in invoice.items
            ],
            "payments": [
                {
                    "payment_id": str(p.id),
                    "amount": str(p.amount.amount),
                    "method": p.method.value,
                    "transaction_ref": p.transaction_ref,
                    "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                }
                for p in payments
            ],
        })

    @extend_schema(
        summary="Update invoice status",
        description=(
            "Currently supports **cancelling** an invoice (`status: cancelled`). "
            "Cannot cancel an invoice that is already fully paid."
        ),
        request=UpdateInvoiceSerializer,
        responses={200: InvoiceSummarySerializer},
    )
    def patch(self, request: Request, invoice_id: uuid.UUID) -> Response:
        serializer = UpdateInvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]

        try:
            if new_status == "cancelled":
                result = CancelInvoiceUseCase(uow=DjangoUnitOfWork()).execute(invoice_id)
                return Response(result)
            else:
                return Response(
                    {"error": f"Unsupported status transition: {new_status}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["billing"])
class PaymentView(AuditMixin, APIView):
    audit_resource_type = "payment"
    permission_classes = [IsAuthenticated, ModulePermission("billing")]

    @extend_schema(
        summary="Record a payment",
        description=(
            "Record a payment against an issued or partially-paid invoice. "
            "Payment amount must be > 0 and cannot exceed the remaining balance. "
            "Invoice status is automatically updated to **paid** or **partially_paid**. "
            "Billing staff only (receptionist, assistant, admin, super_admin)."
        ),
        request=RecordPaymentSerializer,
        responses={201: RecordPaymentResponseSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = RecordPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        dto = RecordPaymentDTO(
            invoice_id=str(data["invoice_id"]),
            amount=data["amount"],
            method=data["method"],
            transaction_ref=data.get("transaction_ref", ""),
            recorded_by_id=str(request.user.id),
        )

        try:
            result = RecordPaymentUseCase(uow=DjangoUnitOfWork()).execute(dto)
            return Response(result, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

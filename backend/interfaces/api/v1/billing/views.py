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
from interfaces.api.v1.billing.serializers import (
    CreateInvoiceResponseSerializer,
    CreateInvoiceSerializer,
    InvoiceDetailSerializer,
    InvoiceSummarySerializer,
    RecordPaymentResponseSerializer,
    RecordPaymentSerializer,
    UpdateInvoiceSerializer,
)
from interfaces.permissions import RolePermission


# ── Helper ────────────────────────────────────────────────────────────────────

def _invoice_to_dict(invoice) -> dict:
    return {
        "invoice_id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "patient_id": str(invoice.patient_id),
        "consultation_id": str(invoice.consultation_id) if invoice.consultation_id else None,
        "status": invoice.status.value,
        "subtotal": str(invoice.subtotal.amount),
        "discount_percent": str(invoice.discount_percent),
        "total_due": str(invoice.total_due.amount),
        "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
        "item_count": len(invoice.items),
        "items": [
            {
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": str(item.unit_price.amount),
                "total": str(item.total.amount),
            }
            for item in invoice.items
        ],
    }


# ── Views ─────────────────────────────────────────────────────────────────────

@extend_schema(tags=["billing"])
class InvoiceView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["receptionist", "admin"])]

    @extend_schema(
        summary="List invoices for a patient",
        description="Returns all invoices for a given patient, newest first.",
        responses={200: InvoiceSummarySerializer(many=True)},
    )
    def get(self, request: Request) -> Response:
        patient_id_str = request.query_params.get("patient_id")
        if not patient_id_str:
            return Response(
                {"error": "patient_id query param is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            patient_id = uuid.UUID(patient_id_str)
        except ValueError:
            return Response({"error": "Invalid patient_id"}, status=status.HTTP_400_BAD_REQUEST)

        with DjangoUnitOfWork() as uow:
            invoices = uow.billing.get_invoices_by_patient(patient_id)

        return Response([
            {
                "invoice_id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "patient_id": str(inv.patient_id),
                "status": inv.status.value,
                "subtotal": str(inv.subtotal.amount),
                "discount_percent": str(inv.discount_percent),
                "total_due": str(inv.total_due.amount),
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
                "item_count": len(inv.items),
            }
            for inv in invoices
        ])

    @extend_schema(
        summary="Create invoice",
        description=(
            "Create a new invoice for a patient. "
            "Optionally link it to a consultation. "
            "The invoice is immediately set to **issued** status."
        ),
        request=CreateInvoiceSerializer,
        responses={201: CreateInvoiceResponseSerializer},
    )
    def post(self, request: Request) -> Response:
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
class InvoiceDetailView(APIView):
    permission_classes = [IsAuthenticated]

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

        return Response({
            **_invoice_to_dict(invoice),
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
        # Only receptionists and admins may cancel invoices
        role = getattr(request.user, "role", "")
        ADMIN_ROLES = {"admin", "super_admin"}
        if role not in ({"receptionist"} | ADMIN_ROLES):
            return Response(
                {"error": "Only receptionists can update invoices"},
                status=status.HTTP_403_FORBIDDEN,
            )

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
class PaymentView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["receptionist", "admin"])]

    @extend_schema(
        summary="Record a payment",
        description=(
            "Record a payment against an issued or partially-paid invoice. "
            "Payment amount must be > 0 and cannot exceed the remaining balance. "
            "Invoice status is automatically updated to **paid** or **partially_paid**."
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

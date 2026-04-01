import uuid

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.billing_dto import CreateInvoiceDTO, InvoiceItemDTO, RecordPaymentDTO
from application.use_cases.billing.create_invoice import CreateInvoiceUseCase
from application.use_cases.billing.record_payment import RecordPaymentUseCase
from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork
from interfaces.api.v1.billing.serializers import CreateInvoiceSerializer, RecordPaymentSerializer
from interfaces.permissions import RolePermission


class InvoiceView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["receptionist", "admin", "doctor"])]

    def post(self, request: Request) -> Response:
        serializer = CreateInvoiceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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


class PaymentView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["receptionist", "admin"])]

    def post(self, request: Request) -> Response:
        serializer = RecordPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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


class InvoiceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, invoice_id: uuid.UUID) -> Response:
        with DjangoUnitOfWork() as uow:
            invoice = uow.billing.get_invoice_by_id(invoice_id)
        if not invoice:
            return Response({"error": "Invoice not found"}, status=status.HTTP_404_NOT_FOUND)

        payments = []
        with DjangoUnitOfWork() as uow:
            raw_payments = uow.billing.get_payments_by_invoice(invoice_id)
        for p in raw_payments:
            payments.append({
                "payment_id": str(p.id),
                "amount": str(p.amount.amount),
                "method": p.method.value,
                "transaction_ref": p.transaction_ref,
                "paid_at": p.paid_at.isoformat() if p.paid_at else None,
            })

        items = [
            {
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": str(item.unit_price.amount),
                "total": str(item.total.amount),
            }
            for item in invoice.items
        ]

        return Response({
            "invoice_id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "patient_id": str(invoice.patient_id),
            "consultation_id": str(invoice.consultation_id) if invoice.consultation_id else None,
            "items": items,
            "subtotal": str(invoice.subtotal.amount),
            "discount_percent": str(invoice.discount_percent),
            "total_due": str(invoice.total_due.amount),
            "status": invoice.status.value,
            "payments": payments,
        })

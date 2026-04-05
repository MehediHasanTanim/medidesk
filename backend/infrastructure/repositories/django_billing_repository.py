from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from domain.entities.billing import Invoice, InvoiceItem, InvoiceStatus, Payment, PaymentMethod
from domain.repositories.i_billing_repository import IBillingRepository
from domain.value_objects.money import Money
from infrastructure.orm.models.billing_model import InvoiceItemModel, InvoiceModel, PaymentModel


class DjangoBillingRepository(IBillingRepository):

    def get_invoice_by_id(self, invoice_id: UUID) -> Optional[Invoice]:
        try:
            return self._invoice_to_domain(
                InvoiceModel.objects.prefetch_related("items").get(id=invoice_id)
            )
        except InvoiceModel.DoesNotExist:
            return None

    def save_invoice(self, invoice: Invoice) -> Invoice:
        model, _ = InvoiceModel.objects.update_or_create(
            id=invoice.id,
            defaults={
                "invoice_number": invoice.invoice_number,
                "patient_id": invoice.patient_id,
                "consultation_id": invoice.consultation_id,
                "discount_percent": invoice.discount_percent,
                "status": invoice.status.value,
            },
        )
        model.items.all().delete()
        InvoiceItemModel.objects.bulk_create([
            InvoiceItemModel(
                invoice=model,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price.amount,
            )
            for item in invoice.items
        ])
        return invoice

    def save_payment(self, payment: Payment) -> Payment:
        PaymentModel.objects.update_or_create(
            id=payment.id,
            defaults={
                "invoice_id": payment.invoice_id,
                "amount": payment.amount.amount,
                "method": payment.method.value,
                "transaction_ref": payment.transaction_ref,
                "recorded_by_id": payment.recorded_by_id,
            },
        )
        return payment

    def get_payments_by_invoice(self, invoice_id: UUID) -> List[Payment]:
        qs = PaymentModel.objects.filter(invoice_id=invoice_id)
        return [self._payment_to_domain(m) for m in qs]

    def get_invoices_by_patient(self, patient_id: UUID, limit: int = 50) -> List[Invoice]:
        qs = InvoiceModel.objects.prefetch_related("items").filter(
            patient_id=patient_id
        ).order_by("-created_at")[:limit]
        return [self._invoice_to_domain(m) for m in qs]

    def get_invoices_by_date_range(self, start: date, end: date) -> List[Invoice]:
        qs = InvoiceModel.objects.prefetch_related("items").filter(
            created_at__date__gte=start, created_at__date__lte=end
        )
        return [self._invoice_to_domain(m) for m in qs]

    @staticmethod
    def _invoice_to_domain(model: InvoiceModel) -> Invoice:
        items = [
            InvoiceItem(
                description=item.description,
                quantity=item.quantity,
                unit_price=Money(Decimal(str(item.unit_price))),
            )
            for item in model.items.all()
        ]
        return Invoice(
            id=model.id,
            invoice_number=model.invoice_number,
            patient_id=model.patient_id,
            consultation_id=model.consultation_id,
            items=items,
            discount_percent=model.discount_percent,
            status=InvoiceStatus(model.status),
            created_at=model.created_at,
        )

    @staticmethod
    def _payment_to_domain(model: PaymentModel) -> Payment:
        return Payment(
            id=model.id,
            invoice_id=model.invoice_id,
            amount=Money(Decimal(str(model.amount))),
            method=PaymentMethod(model.method),
            transaction_ref=model.transaction_ref,
            paid_at=model.paid_at,
            recorded_by_id=model.recorded_by_id,
        )

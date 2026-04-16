import uuid
from decimal import Decimal

from domain.entities.billing import InvoiceStatus, Payment, PaymentMethod
from domain.repositories.i_unit_of_work import IUnitOfWork
from domain.value_objects.money import Money
from application.dtos.billing_dto import RecordPaymentDTO


class RecordPaymentUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: RecordPaymentDTO) -> dict:
        with self._uow:
            invoice = self._uow.billing.get_invoice_by_id(uuid.UUID(dto.invoice_id))
            if not invoice:
                raise ValueError("Invoice not found")
            if invoice.status == InvoiceStatus.CANCELLED:
                raise ValueError("Cannot record payment for a cancelled invoice")
            if invoice.status == InvoiceStatus.PAID:
                raise ValueError("Invoice is already fully paid")

            # Calculate how much has already been paid
            existing_payments = self._uow.billing.get_payments_by_invoice(invoice.id)
            already_paid = sum(p.amount.amount for p in existing_payments)
            remaining = invoice.total_due.amount - already_paid

            if remaining <= Decimal("0"):
                raise ValueError("Invoice is already fully paid")

            payment_amount = Decimal(str(dto.amount))
            if payment_amount > remaining:
                raise ValueError(
                    f"Payment amount ৳{payment_amount} exceeds the remaining balance of ৳{remaining}"
                )

            payment = Payment(
                id=uuid.uuid4(),
                invoice_id=invoice.id,
                amount=Money(payment_amount),
                method=PaymentMethod(dto.method),
                transaction_ref=dto.transaction_ref,
                recorded_by_id=uuid.UUID(dto.recorded_by_id) if dto.recorded_by_id else None,
            )

            total_paid = already_paid + payment_amount
            if total_paid >= invoice.total_due.amount:
                invoice.status = InvoiceStatus.PAID
            else:
                invoice.status = InvoiceStatus.PARTIALLY_PAID

            self._uow.billing.save_payment(payment)
            self._uow.billing.save_invoice(invoice)
            self._uow.commit()

        balance_remaining = invoice.total_due.amount - total_paid
        return {
            "payment_id": str(payment.id),
            "invoice_id": str(invoice.id),
            "amount_paid": str(payment.amount.amount),
            "invoice_status": invoice.status.value,
            "balance_remaining": str(max(balance_remaining, Decimal("0"))),
        }

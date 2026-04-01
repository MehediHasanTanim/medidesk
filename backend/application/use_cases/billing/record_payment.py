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

            payment = Payment(
                id=uuid.uuid4(),
                invoice_id=invoice.id,
                amount=Money(Decimal(str(dto.amount))),
                method=PaymentMethod(dto.method),
                transaction_ref=dto.transaction_ref,
                recorded_by_id=uuid.UUID(dto.recorded_by_id) if dto.recorded_by_id else None,
            )

            existing_payments = self._uow.billing.get_payments_by_invoice(invoice.id)
            total_paid = sum(p.amount.amount for p in existing_payments) + payment.amount.amount

            if total_paid >= invoice.total_due.amount:
                invoice.status = InvoiceStatus.PAID
            else:
                invoice.status = InvoiceStatus.PARTIALLY_PAID

            self._uow.billing.save_payment(payment)
            self._uow.billing.save_invoice(invoice)
            self._uow.commit()

        return {
            "payment_id": str(payment.id),
            "invoice_id": str(invoice.id),
            "amount_paid": str(payment.amount.amount),
            "invoice_status": invoice.status.value,
        }

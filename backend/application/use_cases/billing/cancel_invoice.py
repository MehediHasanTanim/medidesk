import uuid

from domain.entities.billing import InvoiceStatus
from domain.repositories.i_unit_of_work import IUnitOfWork


class CancelInvoiceUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, invoice_id: uuid.UUID) -> dict:
        with self._uow:
            invoice = self._uow.billing.get_invoice_by_id(invoice_id)
            if not invoice:
                raise ValueError("Invoice not found")
            if invoice.status == InvoiceStatus.PAID:
                raise ValueError("Cannot cancel a fully paid invoice")
            if invoice.status == InvoiceStatus.CANCELLED:
                raise ValueError("Invoice is already cancelled")

            invoice.status = InvoiceStatus.CANCELLED
            self._uow.billing.save_invoice(invoice)
            self._uow.commit()

        return {
            "invoice_id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "status": invoice.status.value,
        }

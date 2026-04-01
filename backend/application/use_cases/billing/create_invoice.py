import uuid
from decimal import Decimal

from domain.entities.billing import Invoice, InvoiceItem, InvoiceStatus
from domain.repositories.i_unit_of_work import IUnitOfWork
from domain.value_objects.money import Money
from application.dtos.billing_dto import CreateInvoiceDTO


class CreateInvoiceUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: CreateInvoiceDTO) -> dict:
        items = [
            InvoiceItem(
                description=item.description,
                quantity=item.quantity,
                unit_price=Money(Decimal(str(item.unit_price))),
            )
            for item in dto.items
        ]

        invoice_number = self._generate_invoice_number()

        invoice = Invoice(
            id=uuid.uuid4(),
            invoice_number=invoice_number,
            patient_id=uuid.UUID(dto.patient_id),
            consultation_id=uuid.UUID(dto.consultation_id) if dto.consultation_id else None,
            items=items,
            discount_percent=Decimal(str(dto.discount_percent)),
            status=InvoiceStatus.ISSUED,
        )

        with self._uow:
            self._uow.billing.save_invoice(invoice)
            self._uow.commit()

        return {
            "invoice_id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "subtotal": str(invoice.subtotal.amount),
            "total_due": str(invoice.total_due.amount),
            "status": invoice.status.value,
        }

    @staticmethod
    def _generate_invoice_number() -> str:
        from django.utils import timezone
        now = timezone.now()
        suffix = uuid.uuid4().hex[:6].upper()
        return f"INV-{now.strftime('%Y%m%d')}-{suffix}"

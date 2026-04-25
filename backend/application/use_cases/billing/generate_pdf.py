from decimal import Decimal, ROUND_HALF_UP

from django.template.loader import render_to_string
from django.utils import timezone
from weasyprint import HTML

from infrastructure.orm.models.billing_model import InvoiceModel


def _fmt(value) -> str:
    return str(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


class GenerateInvoicePDFUseCase:
    def execute(self, invoice_id) -> bytes:
        try:
            invoice = (
                InvoiceModel.objects
                .select_related("patient")
                .prefetch_related("items", "payments")
                .get(id=invoice_id)
            )
        except InvoiceModel.DoesNotExist:
            raise ValueError(f"Invoice {invoice_id} not found")

        items = []
        subtotal = Decimal("0")
        for item in invoice.items.all():
            line_total = Decimal(str(item.unit_price)) * item.quantity
            subtotal += line_total
            items.append({
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": _fmt(item.unit_price),
                "total": _fmt(line_total),
            })

        discount_pct = Decimal(str(invoice.discount_percent))
        discount_amt = (subtotal * discount_pct / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        total_due = subtotal - discount_amt

        payments = []
        total_paid = Decimal("0")
        for p in invoice.payments.all().order_by("paid_at"):
            total_paid += Decimal(str(p.amount))
            payments.append({
                "method": p.get_method_display(),
                "amount": _fmt(p.amount),
                "transaction_ref": p.transaction_ref,
                "paid_at": (
                    timezone.localtime(p.paid_at).strftime("%d %b %Y, %I:%M %p")
                    if p.paid_at else ""
                ),
            })

        balance = max(total_due - total_paid, Decimal("0"))

        context = {
            "invoice_number": invoice.invoice_number,
            "invoice_date": (
                timezone.localtime(invoice.created_at).strftime("%d %b %Y")
                if invoice.created_at else ""
            ),
            "status": invoice.status,
            "patient_name": invoice.patient.full_name,
            "patient_phone": invoice.patient.phone,
            "patient_id_display": invoice.patient.patient_id,
            "items": items,
            "subtotal": _fmt(subtotal),
            "discount_percent": _fmt(discount_pct).rstrip("0").rstrip(".") if discount_pct else "0",
            "discount_amt": _fmt(discount_amt),
            "total_due": _fmt(total_due),
            "payments": payments,
            "total_paid": _fmt(total_paid),
            "balance_remaining": _fmt(balance),
            "generated_at": timezone.localtime().strftime("%d %b %Y, %I:%M %p"),
        }

        html_string = render_to_string("billing/invoice.html", context)
        return HTML(string=html_string).write_pdf()

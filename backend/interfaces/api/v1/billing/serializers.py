from decimal import Decimal

from rest_framework import serializers


# ── Request serializers ───────────────────────────────────────────────────────

class InvoiceItemInputSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=255)
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))


class CreateInvoiceSerializer(serializers.Serializer):
    patient_id = serializers.UUIDField()
    consultation_id = serializers.UUIDField(required=False, allow_null=True)
    items = InvoiceItemInputSerializer(many=True, min_length=1)
    discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, default=0, min_value=0, max_value=100
    )


PAYMENT_METHODS = ["cash", "bkash", "nagad", "card"]


class RecordPaymentSerializer(serializers.Serializer):
    invoice_id = serializers.UUIDField()
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0.01")
    )
    method = serializers.ChoiceField(choices=PAYMENT_METHODS)
    transaction_ref = serializers.CharField(allow_blank=True, default="")


class UpdateInvoiceSerializer(serializers.Serializer):
    """PATCH body — currently only allows cancelling an invoice."""
    ALLOWED_STATUSES = ["cancelled"]
    status = serializers.ChoiceField(choices=ALLOWED_STATUSES)


# ── Response serializers (used by @extend_schema for docs) ────────────────────

class InvoiceItemResponseSerializer(serializers.Serializer):
    description = serializers.CharField()
    quantity = serializers.IntegerField()
    unit_price = serializers.CharField()
    total = serializers.CharField()


class PaymentResponseSerializer(serializers.Serializer):
    payment_id = serializers.UUIDField()
    amount = serializers.CharField()
    method = serializers.CharField()
    transaction_ref = serializers.CharField()
    paid_at = serializers.DateTimeField(allow_null=True)


class InvoiceSummarySerializer(serializers.Serializer):
    invoice_id = serializers.UUIDField()
    invoice_number = serializers.CharField()
    patient_id = serializers.UUIDField()
    status = serializers.CharField()
    subtotal = serializers.CharField()
    discount_percent = serializers.CharField()
    total_due = serializers.CharField()
    created_at = serializers.DateTimeField(allow_null=True)
    item_count = serializers.IntegerField()


class InvoiceDetailSerializer(InvoiceSummarySerializer):
    consultation_id = serializers.UUIDField(allow_null=True)
    items = InvoiceItemResponseSerializer(many=True)
    payments = PaymentResponseSerializer(many=True)


class CreateInvoiceResponseSerializer(serializers.Serializer):
    invoice_id = serializers.UUIDField()
    invoice_number = serializers.CharField()
    subtotal = serializers.CharField()
    total_due = serializers.CharField()
    status = serializers.CharField()


class RecordPaymentResponseSerializer(serializers.Serializer):
    payment_id = serializers.UUIDField()
    invoice_id = serializers.UUIDField()
    amount_paid = serializers.CharField()
    invoice_status = serializers.CharField()
    balance_remaining = serializers.CharField()

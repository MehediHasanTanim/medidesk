from rest_framework import serializers


class InvoiceItemInputSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=255)
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)


class CreateInvoiceSerializer(serializers.Serializer):
    patient_id = serializers.UUIDField()
    consultation_id = serializers.UUIDField(required=False, allow_null=True)
    items = InvoiceItemInputSerializer(many=True, min_length=1)
    discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, default=0, min_value=0, max_value=100
    )


class RecordPaymentSerializer(serializers.Serializer):
    METHODS = ["cash", "bkash", "nagad", "card"]
    invoice_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    method = serializers.ChoiceField(choices=METHODS)
    transaction_ref = serializers.CharField(allow_blank=True, default="")

from rest_framework import serializers


class CreateTestOrderSerializer(serializers.Serializer):
    """Input: one or more test orders for a consultation."""
    test_name = serializers.CharField(max_length=255)
    lab_name = serializers.CharField(max_length=255, required=False, default="", allow_blank=True)
    notes = serializers.CharField(required=False, default="", allow_blank=True)


class BulkCreateTestOrderSerializer(serializers.Serializer):
    """Wrap multiple orders in a single request."""
    orders = CreateTestOrderSerializer(many=True)


class UpdateTestOrderSerializer(serializers.Serializer):
    test_name = serializers.CharField(max_length=255, required=False)
    lab_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    is_completed = serializers.BooleanField(required=False)
    # Only doctors may set this field; view enforces the role check
    approval_status = serializers.ChoiceField(
        choices=["approved", "rejected"], required=False
    )


class TestOrderResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    consultation_id = serializers.UUIDField()
    patient_id = serializers.UUIDField()
    patient_name = serializers.CharField(default="")
    test_name = serializers.CharField()
    lab_name = serializers.CharField()
    notes = serializers.CharField()
    ordered_by_id = serializers.UUIDField(allow_null=True)
    ordered_by_name = serializers.CharField()
    ordered_at = serializers.DateTimeField()
    is_completed = serializers.BooleanField()
    completed_at = serializers.DateTimeField(allow_null=True)
    approval_status = serializers.CharField()

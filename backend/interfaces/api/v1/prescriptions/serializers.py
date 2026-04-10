from rest_framework import serializers


# ── Request serializers ──────────────────────────────────────────────────────

class PrescriptionItemInputSerializer(serializers.Serializer):
    medicine_id = serializers.UUIDField()
    medicine_name = serializers.CharField(max_length=255)
    morning = serializers.CharField(max_length=10)
    afternoon = serializers.CharField(max_length=10)
    evening = serializers.CharField(max_length=10)
    duration_days = serializers.IntegerField(min_value=1)
    route = serializers.ChoiceField(
        choices=["oral", "sublingual", "topical", "inhaled", "iv", "im", "sc", "rectal", "nasal", "ophthalmic"],
        default="oral",
    )
    instructions = serializers.CharField(allow_blank=True, default="")


class CreatePrescriptionSerializer(serializers.Serializer):
    consultation_id = serializers.UUIDField()
    patient_id = serializers.UUIDField()
    items = PrescriptionItemInputSerializer(many=True, min_length=1)
    follow_up_date = serializers.DateField(required=False, allow_null=True)


# ── Response serializers ─────────────────────────────────────────────────────

class PrescriptionItemResponseSerializer(serializers.Serializer):
    medicine_id = serializers.UUIDField()
    medicine_name = serializers.CharField()
    morning = serializers.CharField()
    afternoon = serializers.CharField()
    evening = serializers.CharField()
    duration_days = serializers.IntegerField()
    dosage_display = serializers.CharField(help_text="e.g. '1+0+1 × 7 days'")
    route = serializers.CharField()
    instructions = serializers.CharField()


class PrescriptionResponseSerializer(serializers.Serializer):
    prescription_id = serializers.UUIDField()
    consultation_id = serializers.UUIDField()
    patient_id = serializers.UUIDField()
    prescribed_by_id = serializers.UUIDField()
    approved_by_id = serializers.UUIDField(allow_null=True)
    status = serializers.ChoiceField(choices=["draft", "active", "approved"])
    follow_up_date = serializers.DateField(allow_null=True)
    created_at = serializers.DateTimeField(allow_null=True)
    items = PrescriptionItemResponseSerializer(many=True)


class CreatePrescriptionResponseSerializer(serializers.Serializer):
    prescription_id = serializers.UUIDField()
    status = serializers.ChoiceField(choices=["draft", "active", "approved"])
    item_count = serializers.IntegerField()
    follow_up_date = serializers.DateField(allow_null=True)


class ApproveResponseSerializer(serializers.Serializer):
    prescription_id = serializers.UUIDField()
    status = serializers.CharField()
    approved_by_id = serializers.UUIDField()


class PendingPrescriptionSerializer(serializers.Serializer):
    prescription_id = serializers.UUIDField()
    consultation_id = serializers.UUIDField()
    patient_id = serializers.UUIDField()
    patient_name = serializers.CharField()
    prescribed_by_id = serializers.UUIDField()
    prescribed_by_name = serializers.CharField()
    status = serializers.CharField()
    follow_up_date = serializers.DateField(allow_null=True)
    created_at = serializers.DateTimeField(allow_null=True)
    item_count = serializers.IntegerField()

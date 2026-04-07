from rest_framework import serializers


# ── Request serializers ──────────────────────────────────────────────────────

class StartConsultationSerializer(serializers.Serializer):
    appointment_id = serializers.UUIDField()
    patient_id = serializers.UUIDField()
    chief_complaints = serializers.CharField()


class CompleteConsultationSerializer(serializers.Serializer):
    diagnosis = serializers.CharField()
    clinical_findings = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    # Vitals — all optional, can be recorded at completion time
    bp_systolic = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=300)
    bp_diastolic = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=200)
    pulse = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=300)
    temperature = serializers.DecimalField(required=False, allow_null=True, max_digits=4, decimal_places=1)
    weight = serializers.DecimalField(required=False, allow_null=True, max_digits=5, decimal_places=1)
    height = serializers.DecimalField(required=False, allow_null=True, max_digits=5, decimal_places=1)
    spo2 = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=100)


class UpdateConsultationSerializer(serializers.Serializer):
    """Partial update of a draft consultation's text fields."""
    chief_complaints = serializers.CharField(required=False)
    clinical_findings = serializers.CharField(required=False, allow_blank=True)
    diagnosis = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class VitalsSerializer(serializers.Serializer):
    """Used by the PATCH /vitals/ endpoint."""
    bp_systolic = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=300)
    bp_diastolic = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=200)
    pulse = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=300)
    temperature = serializers.DecimalField(required=False, allow_null=True, max_digits=4, decimal_places=1)
    weight = serializers.DecimalField(required=False, allow_null=True, max_digits=5, decimal_places=1)
    height = serializers.DecimalField(required=False, allow_null=True, max_digits=5, decimal_places=1)
    spo2 = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=100)


# ── Response serializers ─────────────────────────────────────────────────────

class VitalsEmbeddedSerializer(serializers.Serializer):
    """Vitals as a nested object inside a ConsultationResponse."""
    bp_systolic = serializers.IntegerField(allow_null=True)
    bp_diastolic = serializers.IntegerField(allow_null=True)
    bp_display = serializers.CharField(allow_null=True)
    pulse = serializers.IntegerField(allow_null=True)
    temperature = serializers.DecimalField(allow_null=True, max_digits=4, decimal_places=1)
    weight = serializers.DecimalField(allow_null=True, max_digits=5, decimal_places=1)
    height = serializers.DecimalField(allow_null=True, max_digits=5, decimal_places=1)
    spo2 = serializers.IntegerField(allow_null=True)
    bmi = serializers.DecimalField(allow_null=True, max_digits=5, decimal_places=1)


class ConsultationResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    appointment_id = serializers.UUIDField()
    patient_id = serializers.UUIDField()
    doctor_id = serializers.UUIDField()
    chief_complaints = serializers.CharField()
    clinical_findings = serializers.CharField()
    diagnosis = serializers.CharField()
    notes = serializers.CharField()
    is_draft = serializers.BooleanField()
    created_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    vitals = VitalsEmbeddedSerializer(allow_null=True)


class StartConsultationResponseSerializer(serializers.Serializer):
    consultation_id = serializers.UUIDField()
    status = serializers.CharField()


class VitalsResponseSerializer(serializers.Serializer):
    """Returned by the standalone PATCH /vitals/ endpoint."""
    consultation_id = serializers.UUIDField()
    bp_systolic = serializers.IntegerField(allow_null=True)
    bp_diastolic = serializers.IntegerField(allow_null=True)
    bp_display = serializers.CharField(allow_null=True)
    pulse = serializers.IntegerField(allow_null=True)
    temperature = serializers.DecimalField(allow_null=True, max_digits=4, decimal_places=1)
    weight = serializers.DecimalField(allow_null=True, max_digits=5, decimal_places=1)
    height = serializers.DecimalField(allow_null=True, max_digits=5, decimal_places=1)
    spo2 = serializers.IntegerField(allow_null=True)
    bmi = serializers.DecimalField(allow_null=True, max_digits=5, decimal_places=1)

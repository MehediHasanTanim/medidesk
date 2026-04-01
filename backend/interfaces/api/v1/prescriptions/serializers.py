from rest_framework import serializers


class PrescriptionItemInputSerializer(serializers.Serializer):
    medicine_id = serializers.UUIDField()
    medicine_name = serializers.CharField(max_length=255)
    morning = serializers.CharField(max_length=10)
    afternoon = serializers.CharField(max_length=10)
    evening = serializers.CharField(max_length=10)
    duration_days = serializers.IntegerField(min_value=1)
    route = serializers.CharField(max_length=20, default="oral")
    instructions = serializers.CharField(allow_blank=True, default="")


class CreatePrescriptionSerializer(serializers.Serializer):
    consultation_id = serializers.UUIDField()
    patient_id = serializers.UUIDField()
    items = PrescriptionItemInputSerializer(many=True, min_length=1)
    follow_up_date = serializers.DateField(required=False, allow_null=True)

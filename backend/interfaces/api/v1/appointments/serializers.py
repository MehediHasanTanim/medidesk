from rest_framework import serializers


class BookAppointmentSerializer(serializers.Serializer):
    patient_id = serializers.UUIDField()
    doctor_id = serializers.UUIDField(required=False, allow_null=True, help_text="Required when booked by receptionist/assistant. Doctors default to themselves.")
    scheduled_at = serializers.DateTimeField()
    appointment_type = serializers.ChoiceField(choices=["new", "follow_up", "walk_in"])
    chamber_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, default="", allow_blank=True)


class AppointmentResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    patient_name = serializers.CharField()
    patient_phone = serializers.CharField()
    scheduled_at = serializers.DateTimeField()
    appointment_type = serializers.CharField()
    status = serializers.CharField()
    token_number = serializers.IntegerField(allow_null=True)


class QueueItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    token_number = serializers.IntegerField(allow_null=True)
    patient_id = serializers.UUIDField()
    scheduled_at = serializers.DateTimeField()
    appointment_type = serializers.CharField()
    status = serializers.CharField()
    notes = serializers.CharField()

from rest_framework import serializers


class BookAppointmentSerializer(serializers.Serializer):
    patient_id = serializers.UUIDField()
    doctor_id = serializers.UUIDField(
        required=False, allow_null=True,
        help_text="Required when booked by receptionist/assistant. Doctors default to themselves.",
    )
    scheduled_at = serializers.DateTimeField()
    appointment_type = serializers.ChoiceField(choices=["new", "follow_up", "walk_in"])
    chamber_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, default="", allow_blank=True)


class AppointmentResponseSerializer(serializers.Serializer):
    """Used for the POST /appointments/ response."""
    id = serializers.UUIDField()
    patient_id = serializers.UUIDField()
    patient_name = serializers.CharField()
    patient_phone = serializers.CharField()
    doctor_id = serializers.UUIDField()
    chamber_id = serializers.UUIDField(allow_null=True)
    scheduled_at = serializers.DateTimeField()
    appointment_type = serializers.CharField()
    status = serializers.CharField()
    token_number = serializers.IntegerField(allow_null=True)
    notes = serializers.CharField()


class AppointmentListItemSerializer(serializers.Serializer):
    """Used for GET /appointments/ list responses (enriched with patient & doctor names)."""
    id = serializers.UUIDField()
    patient_id = serializers.UUIDField()
    patient_name = serializers.CharField()
    patient_phone = serializers.CharField()
    doctor_id = serializers.UUIDField()
    doctor_name = serializers.CharField()
    chamber_id = serializers.UUIDField(allow_null=True)
    scheduled_at = serializers.DateTimeField()
    appointment_type = serializers.CharField()
    status = serializers.CharField()
    token_number = serializers.IntegerField(allow_null=True)
    notes = serializers.CharField()


class UpdateAppointmentSerializer(serializers.Serializer):
    """All fields optional — only supplied fields are updated."""
    doctor_id = serializers.UUIDField(required=False, allow_null=True)
    scheduled_at = serializers.DateTimeField(required=False)
    appointment_type = serializers.ChoiceField(
        choices=["new", "follow_up", "walk_in"], required=False
    )
    chamber_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class StatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=["confirmed", "cancelled", "no_show", "in_progress", "completed"],
        help_text="New status. Use the dedicated check-in endpoint for 'in_queue'.",
    )


class QueueItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    token_number = serializers.IntegerField(allow_null=True)
    patient_id = serializers.UUIDField()
    patient_name = serializers.CharField()
    patient_phone = serializers.CharField()
    scheduled_at = serializers.DateTimeField()
    appointment_type = serializers.CharField()
    status = serializers.CharField()
    notes = serializers.CharField()


class CheckInResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    status = serializers.CharField()
    token_number = serializers.IntegerField(allow_null=True)

from rest_framework import serializers


# ── Speciality ────────────────────────────────────────────────────────────────

class SpecialityResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    description = serializers.CharField()
    is_active = serializers.BooleanField()
    doctor_count = serializers.IntegerField()


class CreateSpecialitySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, default="", allow_blank=True)


class UpdateSpecialitySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)


# ── Doctor Profile ────────────────────────────────────────────────────────────

class DoctorProfileResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    user_id = serializers.UUIDField()
    username = serializers.CharField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField()
    is_active = serializers.BooleanField()
    speciality_id = serializers.UUIDField()
    speciality_name = serializers.CharField()
    qualifications = serializers.CharField()
    bio = serializers.CharField()
    consultation_fee = serializers.FloatField(allow_null=True)
    experience_years = serializers.IntegerField(allow_null=True)
    is_available = serializers.BooleanField()
    visit_days = serializers.ListField(child=serializers.CharField())
    visit_time_start = serializers.CharField(allow_null=True)
    visit_time_end = serializers.CharField(allow_null=True)
    chamber_ids = serializers.ListField(child=serializers.UUIDField())


class CreateDoctorProfileSerializer(serializers.Serializer):
    # User fields
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=8, write_only=True)
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=["doctor", "assistant_doctor"],
        default="doctor",
    )
    # Profile fields
    speciality_id = serializers.UUIDField()
    qualifications = serializers.CharField(
        max_length=500,
        help_text="e.g. MBBS, MD (Cardiology), FCPS",
    )
    bio = serializers.CharField(required=False, default="", allow_blank=True)
    consultation_fee = serializers.FloatField(required=False, allow_null=True, min_value=0)
    experience_years = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    is_available = serializers.BooleanField(required=False, default=True)
    visit_days = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text='e.g. ["Sat", "Sun", "Mon"]',
    )
    visit_time_start = serializers.TimeField(
        required=False, allow_null=True, format="%H:%M", input_formats=["%H:%M"]
    )
    visit_time_end = serializers.TimeField(
        required=False, allow_null=True, format="%H:%M", input_formats=["%H:%M"]
    )
    chamber_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
    )


class UpdateDoctorProfileSerializer(serializers.Serializer):
    # User fields (all optional)
    full_name = serializers.CharField(max_length=255, required=False)
    email = serializers.EmailField(required=False)
    role = serializers.ChoiceField(
        choices=["doctor", "assistant_doctor"], required=False
    )
    is_active = serializers.BooleanField(required=False)
    # Profile fields (all optional)
    speciality_id = serializers.UUIDField(required=False)
    qualifications = serializers.CharField(max_length=500, required=False)
    bio = serializers.CharField(required=False, allow_blank=True)
    consultation_fee = serializers.FloatField(required=False, allow_null=True, min_value=0)
    experience_years = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    is_available = serializers.BooleanField(required=False)
    visit_days = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    visit_time_start = serializers.TimeField(
        required=False, allow_null=True, format="%H:%M", input_formats=["%H:%M"]
    )
    visit_time_end = serializers.TimeField(
        required=False, allow_null=True, format="%H:%M", input_formats=["%H:%M"]
    )
    chamber_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False
    )

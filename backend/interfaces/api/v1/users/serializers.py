from rest_framework import serializers

ROLE_CHOICES = ["super_admin", "admin", "doctor", "assistant_doctor", "receptionist", "assistant"]


class CreateUserSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=ROLE_CHOICES)
    password = serializers.CharField(min_length=8, write_only=True)
    chamber_ids = serializers.ListField(
        child=serializers.UUIDField(), required=True, min_length=1
    )
    supervisor_doctor_id = serializers.UUIDField(required=False, allow_null=True)


class UpdateUserSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=False)
    email = serializers.EmailField(required=False)
    role = serializers.ChoiceField(choices=ROLE_CHOICES, required=False)
    is_active = serializers.BooleanField(required=False)
    chamber_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False
    )
    supervisor_doctor_id = serializers.UUIDField(required=False, allow_null=True)

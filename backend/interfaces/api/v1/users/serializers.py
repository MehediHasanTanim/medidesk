from rest_framework import serializers

ROLE_CHOICES = ["admin", "doctor", "assistant_doctor", "receptionist", "assistant"]


class CreateUserSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=ROLE_CHOICES)
    password = serializers.CharField(min_length=8, write_only=True)
    chamber_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )


class UpdateUserSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=False)
    email = serializers.EmailField(required=False)
    role = serializers.ChoiceField(choices=ROLE_CHOICES, required=False)
    chamber_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False
    )

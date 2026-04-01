from rest_framework import serializers


class CreateChamberSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    address = serializers.CharField()
    phone = serializers.CharField(max_length=20)


class UpdateChamberSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    address = serializers.CharField(required=False)
    phone = serializers.CharField(max_length=20, required=False)
    is_active = serializers.BooleanField(required=False)

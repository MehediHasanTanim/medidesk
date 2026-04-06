from rest_framework import serializers


class CreateChamberSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    address = serializers.CharField()
    phone = serializers.CharField(max_length=20)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)


class UpdateChamberSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    address = serializers.CharField(required=False)
    phone = serializers.CharField(max_length=20, required=False)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)

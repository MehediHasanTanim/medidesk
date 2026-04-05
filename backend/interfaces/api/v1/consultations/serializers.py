from rest_framework import serializers


class VitalsSerializer(serializers.Serializer):
    bp_systolic = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=300)
    bp_diastolic = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=200)
    pulse = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=300)
    temperature = serializers.DecimalField(required=False, allow_null=True, max_digits=4, decimal_places=1)
    weight = serializers.DecimalField(required=False, allow_null=True, max_digits=5, decimal_places=1)
    height = serializers.DecimalField(required=False, allow_null=True, max_digits=5, decimal_places=1)
    spo2 = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=100)


class VitalsResponseSerializer(serializers.Serializer):
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

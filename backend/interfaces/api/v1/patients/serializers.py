from rest_framework import serializers


class RegisterPatientSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20)
    gender = serializers.ChoiceField(choices=["M", "F", "O"])
    address = serializers.CharField()
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    email = serializers.EmailField(required=False, allow_null=True)
    national_id = serializers.CharField(max_length=20, required=False, allow_null=True)
    allergies = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    chronic_diseases = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    family_history = serializers.CharField(required=False, default="", allow_blank=True)


class PatientResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    patient_id = serializers.CharField()
    full_name = serializers.CharField()
    phone = serializers.CharField()
    gender = serializers.CharField()
    address = serializers.CharField()
    age = serializers.IntegerField(allow_null=True)
    email = serializers.EmailField(allow_null=True)
    allergies = serializers.ListField(child=serializers.CharField())
    chronic_diseases = serializers.ListField(child=serializers.CharField())
    family_history = serializers.CharField()

from rest_framework import serializers


class RegisterPatientSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20)
    gender = serializers.ChoiceField(choices=["M", "F", "O"])
    address = serializers.CharField()
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    age_years = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=150)
    email = serializers.EmailField(required=False, allow_null=True)
    national_id = serializers.CharField(max_length=20, required=False, allow_null=True)
    allergies = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    chronic_diseases = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    family_history = serializers.CharField(required=False, default="", allow_blank=True)

    def validate(self, attrs):
        if not attrs.get("date_of_birth") and not attrs.get("age_years"):
            raise serializers.ValidationError(
                {"age_years": "Provide either date of birth or age in years."}
            )
        return attrs


class UpdatePatientSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=False)
    phone = serializers.CharField(max_length=20, required=False)
    gender = serializers.ChoiceField(choices=["M", "F", "O"], required=False)
    address = serializers.CharField(required=False)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    age_years = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=150)
    email = serializers.EmailField(required=False, allow_null=True)
    national_id = serializers.CharField(max_length=20, required=False, allow_null=True)
    allergies = serializers.ListField(child=serializers.CharField(), required=False)
    chronic_diseases = serializers.ListField(child=serializers.CharField(), required=False)
    family_history = serializers.CharField(required=False, allow_blank=True)


class PatientResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    patient_id = serializers.CharField()
    full_name = serializers.CharField()
    phone = serializers.CharField()
    gender = serializers.CharField()
    address = serializers.CharField()
    date_of_birth = serializers.DateField(allow_null=True)
    age_years = serializers.IntegerField(allow_null=True)
    age = serializers.IntegerField(allow_null=True)
    email = serializers.EmailField(allow_null=True)
    national_id = serializers.CharField(allow_null=True)
    allergies = serializers.ListField(child=serializers.CharField())
    chronic_diseases = serializers.ListField(child=serializers.CharField())
    family_history = serializers.CharField()

from rest_framework import serializers

REPORT_CATEGORIES = ["blood_test", "imaging", "biopsy", "other"]


class UploadReportSerializer(serializers.Serializer):
    patient_id = serializers.UUIDField()
    file = serializers.FileField()
    category = serializers.ChoiceField(choices=REPORT_CATEGORIES)
    consultation_id = serializers.UUIDField(required=False, allow_null=True)
    test_order_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, default="", allow_blank=True)


class ReportResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    patient_id = serializers.UUIDField()
    consultation_id = serializers.UUIDField(allow_null=True)
    test_order_id = serializers.UUIDField(allow_null=True)
    category = serializers.CharField()
    file_url = serializers.CharField()
    original_filename = serializers.CharField()
    uploaded_by_name = serializers.CharField()
    uploaded_at = serializers.DateTimeField()
    notes = serializers.CharField()

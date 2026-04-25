from rest_framework import serializers


class AuditLogResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    user_id = serializers.CharField(allow_null=True)
    user_name = serializers.CharField(allow_null=True)
    action = serializers.CharField()
    resource_type = serializers.CharField()
    resource_id = serializers.CharField()
    payload = serializers.DictField()
    ip_address = serializers.CharField(allow_null=True)
    timestamp = serializers.CharField(allow_null=True)


class AuditLogListResponseSerializer(serializers.Serializer):
    results = AuditLogResponseSerializer(many=True)
    count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()

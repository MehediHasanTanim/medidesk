from rest_framework import serializers

FORM_CHOICES = ["tablet", "capsule", "syrup", "injection", "cream", "drops", "inhaler", "other"]


# ── Manufacturer serializers ───────────────────────────────────────────────────

class CreateManufacturerSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    country = serializers.CharField(max_length=100, required=False, default="Bangladesh")


class UpdateManufacturerSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    country = serializers.CharField(max_length=100, required=False)
    is_active = serializers.BooleanField(required=False)


class ManufacturerSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    country = serializers.CharField()
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField()


class PaginatedManufacturerListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    results = ManufacturerSerializer(many=True)


# ── Request serializers ────────────────────────────────────────────────────────

class CreateGenericMedicineSerializer(serializers.Serializer):
    generic_name = serializers.CharField(max_length=255)
    drug_class = serializers.CharField(max_length=100)
    contraindications = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )


class UpdateGenericMedicineSerializer(serializers.Serializer):
    generic_name = serializers.CharField(max_length=255, required=False)
    drug_class = serializers.CharField(max_length=100, required=False)
    contraindications = serializers.ListField(
        child=serializers.CharField(), required=False
    )


class CreateBrandMedicineSerializer(serializers.Serializer):
    generic_id = serializers.UUIDField()
    brand_name = serializers.CharField(max_length=255)
    manufacturer = serializers.CharField(max_length=255)
    strength = serializers.CharField(max_length=50)
    form = serializers.ChoiceField(choices=FORM_CHOICES)
    is_active = serializers.BooleanField(required=False, default=True)


class UpdateBrandMedicineSerializer(serializers.Serializer):
    brand_name = serializers.CharField(max_length=255, required=False)
    manufacturer = serializers.CharField(max_length=255, required=False)
    strength = serializers.CharField(max_length=50, required=False)
    form = serializers.ChoiceField(choices=FORM_CHOICES, required=False)
    is_active = serializers.BooleanField(required=False)


# ── Response serializers ───────────────────────────────────────────────────────

class GenericMedicineSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    generic_name = serializers.CharField()
    drug_class = serializers.CharField()
    contraindications = serializers.ListField(child=serializers.CharField())
    brand_count = serializers.IntegerField(required=False)


class BrandMedicineSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    generic_id = serializers.UUIDField()
    brand_name = serializers.CharField()
    manufacturer = serializers.CharField()
    strength = serializers.CharField()
    form = serializers.CharField()
    is_active = serializers.BooleanField()


class MedicineSearchResultSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    brand_name = serializers.CharField()
    strength = serializers.CharField()
    form = serializers.CharField()
    manufacturer = serializers.CharField()
    generic_id = serializers.UUIDField()


class MedicineSearchResponseSerializer(serializers.Serializer):
    results = MedicineSearchResultSerializer(many=True)


class PaginatedGenericListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    results = GenericMedicineSerializer(many=True)


class PaginatedBrandListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    results = BrandMedicineSerializer(many=True)

from rest_framework import serializers

FORM_CHOICES = [
    "tablet", "capsule", "syrup", "injection", "cream", "drops", "inhaler",
    "powder_for_suspension", "solution", "gel", "ointment", "suppository",
    "patch", "spray", "lotion", "powder", "granules", "other",
]


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


# ── Generic medicine serializers ───────────────────────────────────────────────

class CreateGenericMedicineSerializer(serializers.Serializer):
    generic_name = serializers.CharField(max_length=255)
    drug_class = serializers.CharField(max_length=100)
    therapeutic_class = serializers.CharField(max_length=150, required=False, default="", allow_blank=True)
    # Clinical fields (all optional)
    indications = serializers.CharField(required=False, default="", allow_blank=True)
    dosage_info = serializers.CharField(required=False, default="", allow_blank=True)
    administration = serializers.CharField(required=False, default="", allow_blank=True)
    contraindications = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    side_effects = serializers.CharField(required=False, default="", allow_blank=True)
    drug_interactions = serializers.CharField(required=False, default="", allow_blank=True)
    storage = serializers.CharField(required=False, default="", allow_blank=True)
    pregnancy_notes = serializers.CharField(required=False, default="", allow_blank=True)
    precautions = serializers.CharField(required=False, default="", allow_blank=True)
    mode_of_action = serializers.CharField(required=False, default="", allow_blank=True)


class UpdateGenericMedicineSerializer(serializers.Serializer):
    generic_name = serializers.CharField(max_length=255, required=False)
    drug_class = serializers.CharField(max_length=100, required=False)
    therapeutic_class = serializers.CharField(max_length=150, required=False, allow_blank=True)
    indications = serializers.CharField(required=False, allow_blank=True)
    dosage_info = serializers.CharField(required=False, allow_blank=True)
    administration = serializers.CharField(required=False, allow_blank=True)
    contraindications = serializers.ListField(
        child=serializers.CharField(), required=False
    )
    side_effects = serializers.CharField(required=False, allow_blank=True)
    drug_interactions = serializers.CharField(required=False, allow_blank=True)
    storage = serializers.CharField(required=False, allow_blank=True)
    pregnancy_notes = serializers.CharField(required=False, allow_blank=True)
    precautions = serializers.CharField(required=False, allow_blank=True)
    mode_of_action = serializers.CharField(required=False, allow_blank=True)


class GenericMedicineSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    generic_name = serializers.CharField()
    drug_class = serializers.CharField()
    therapeutic_class = serializers.CharField()
    indications = serializers.CharField()
    dosage_info = serializers.CharField()
    administration = serializers.CharField()
    contraindications = serializers.ListField(child=serializers.CharField())
    side_effects = serializers.CharField()
    drug_interactions = serializers.CharField()
    storage = serializers.CharField()
    pregnancy_notes = serializers.CharField()
    precautions = serializers.CharField()
    mode_of_action = serializers.CharField()
    brand_count = serializers.IntegerField(required=False)


class PaginatedGenericListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    results = GenericMedicineSerializer(many=True)


# ── Brand medicine serializers ─────────────────────────────────────────────────

class CreateBrandMedicineSerializer(serializers.Serializer):
    generic_id = serializers.UUIDField()
    brand_name = serializers.CharField(max_length=255)
    manufacturer = serializers.CharField(max_length=255)
    strength = serializers.CharField(max_length=100)
    form = serializers.ChoiceField(choices=FORM_CHOICES)
    mrp = serializers.FloatField(required=False, allow_null=True, min_value=0)
    product_code = serializers.CharField(max_length=50, required=False, default="", allow_blank=True)
    is_active = serializers.BooleanField(required=False, default=True)


class UpdateBrandMedicineSerializer(serializers.Serializer):
    brand_name = serializers.CharField(max_length=255, required=False)
    manufacturer = serializers.CharField(max_length=255, required=False)
    strength = serializers.CharField(max_length=100, required=False)
    form = serializers.ChoiceField(choices=FORM_CHOICES, required=False)
    mrp = serializers.FloatField(required=False, allow_null=True, min_value=0)
    product_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)


class BrandMedicineSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    generic_id = serializers.UUIDField()
    brand_name = serializers.CharField()
    manufacturer = serializers.CharField()
    strength = serializers.CharField()
    form = serializers.CharField()
    mrp = serializers.FloatField(allow_null=True)
    product_code = serializers.CharField()
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


class PaginatedBrandListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    results = BrandMedicineSerializer(many=True)

from typing import List, Optional
from uuid import UUID

from django.db.models import Q

from domain.entities.medicine import BrandMedicine, GenericMedicine
from domain.repositories.i_medicine_repository import IMedicineRepository
from infrastructure.orm.models.medicine_model import BrandMedicineModel, GenericMedicineModel


class DjangoMedicineRepository(IMedicineRepository):

    # ── Generic medicines ─────────────────────────────────────────────────────

    def list_generics(self, search: str = "", drug_class: str = "",
                      limit: int = 100, offset: int = 0) -> List[GenericMedicine]:
        qs = GenericMedicineModel.objects.all()
        if search:
            qs = qs.filter(generic_name__icontains=search)
        if drug_class:
            qs = qs.filter(drug_class__icontains=drug_class)
        qs = qs.order_by("generic_name")[offset:offset + limit]
        return [self._generic_to_domain(m) for m in qs]

    def count_generics(self, search: str = "", drug_class: str = "") -> int:
        qs = GenericMedicineModel.objects.all()
        if search:
            qs = qs.filter(generic_name__icontains=search)
        if drug_class:
            qs = qs.filter(drug_class__icontains=drug_class)
        return qs.count()

    def get_generic_by_id(self, generic_id: UUID) -> Optional[GenericMedicine]:
        try:
            return self._generic_to_domain(GenericMedicineModel.objects.get(id=generic_id))
        except GenericMedicineModel.DoesNotExist:
            return None

    def create_generic(self, generic: GenericMedicine) -> GenericMedicine:
        model = GenericMedicineModel.objects.create(
            id=generic.id,
            generic_name=generic.generic_name,
            drug_class=generic.drug_class,
            therapeutic_class=generic.therapeutic_class,
            indications=generic.indications,
            dosage_info=generic.dosage_info,
            administration=generic.administration,
            contraindications=generic.contraindications,
            side_effects=generic.side_effects,
            drug_interactions=generic.drug_interactions,
            storage=generic.storage,
            pregnancy_notes=generic.pregnancy_notes,
            precautions=generic.precautions,
            mode_of_action=generic.mode_of_action,
        )
        return self._generic_to_domain(model)

    def update_generic(self, generic: GenericMedicine) -> GenericMedicine:
        GenericMedicineModel.objects.filter(id=generic.id).update(
            generic_name=generic.generic_name,
            drug_class=generic.drug_class,
            therapeutic_class=generic.therapeutic_class,
            indications=generic.indications,
            dosage_info=generic.dosage_info,
            administration=generic.administration,
            contraindications=generic.contraindications,
            side_effects=generic.side_effects,
            drug_interactions=generic.drug_interactions,
            storage=generic.storage,
            pregnancy_notes=generic.pregnancy_notes,
            precautions=generic.precautions,
            mode_of_action=generic.mode_of_action,
        )
        return generic

    def delete_generic(self, generic_id: UUID) -> bool:
        deleted, _ = GenericMedicineModel.objects.filter(id=generic_id).delete()
        return deleted > 0

    def get_generics_by_class(self, drug_class: str) -> List[GenericMedicine]:
        qs = GenericMedicineModel.objects.filter(drug_class__icontains=drug_class)
        return [self._generic_to_domain(m) for m in qs]

    # ── Brand medicines ───────────────────────────────────────────────────────

    def list_brands(self, search: str = "", generic_id: Optional[UUID] = None,
                    form: str = "", active_only: bool = True,
                    limit: int = 100, offset: int = 0) -> List[BrandMedicine]:
        qs = BrandMedicineModel.objects.select_related("generic")
        if active_only:
            qs = qs.filter(is_active=True)
        if search:
            qs = qs.filter(
                Q(brand_name__icontains=search) | Q(generic__generic_name__icontains=search)
            )
        if generic_id:
            qs = qs.filter(generic_id=generic_id)
        if form:
            qs = qs.filter(form=form)
        qs = qs.order_by("brand_name")[offset:offset + limit]
        return [self._brand_to_domain(m) for m in qs]

    def count_brands(self, search: str = "", generic_id: Optional[UUID] = None,
                     form: str = "", active_only: bool = True) -> int:
        qs = BrandMedicineModel.objects.select_related("generic")
        if active_only:
            qs = qs.filter(is_active=True)
        if search:
            qs = qs.filter(
                Q(brand_name__icontains=search) | Q(generic__generic_name__icontains=search)
            )
        if generic_id:
            qs = qs.filter(generic_id=generic_id)
        if form:
            qs = qs.filter(form=form)
        return qs.count()

    def search_brands(self, query: str, limit: int = 10) -> List[BrandMedicine]:
        qs = BrandMedicineModel.objects.select_related("generic").filter(
            Q(brand_name__icontains=query) | Q(generic__generic_name__icontains=query),
            is_active=True,
        )[:limit]
        return [self._brand_to_domain(m) for m in qs]

    def get_brand_by_id(self, medicine_id: UUID) -> Optional[BrandMedicine]:
        try:
            return self._brand_to_domain(
                BrandMedicineModel.objects.select_related("generic").get(id=medicine_id)
            )
        except BrandMedicineModel.DoesNotExist:
            return None

    def create_brand(self, brand: BrandMedicine) -> BrandMedicine:
        model = BrandMedicineModel.objects.create(
            id=brand.id,
            generic_id=brand.generic_id,
            brand_name=brand.brand_name,
            manufacturer=brand.manufacturer,
            strength=brand.strength,
            form=brand.form,
            mrp=brand.mrp,
            product_code=brand.product_code,
            is_active=brand.is_active,
        )
        return self._brand_to_domain(model)

    def update_brand(self, brand: BrandMedicine) -> BrandMedicine:
        BrandMedicineModel.objects.filter(id=brand.id).update(
            brand_name=brand.brand_name,
            manufacturer=brand.manufacturer,
            strength=brand.strength,
            form=brand.form,
            mrp=brand.mrp,
            product_code=brand.product_code,
            is_active=brand.is_active,
        )
        return brand

    def deactivate_brand(self, medicine_id: UUID) -> bool:
        updated = BrandMedicineModel.objects.filter(id=medicine_id).update(is_active=False)
        return updated > 0

    def brand_count_for_generic(self, generic_id: UUID) -> int:
        return BrandMedicineModel.objects.filter(generic_id=generic_id).count()

    # ── Mappers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _generic_to_domain(m: GenericMedicineModel) -> GenericMedicine:
        return GenericMedicine(
            id=m.id,
            generic_name=m.generic_name,
            drug_class=m.drug_class,
            therapeutic_class=m.therapeutic_class or "",
            indications=m.indications or "",
            dosage_info=m.dosage_info or "",
            administration=m.administration or "",
            contraindications=m.contraindications or [],
            side_effects=m.side_effects or "",
            drug_interactions=m.drug_interactions or "",
            storage=m.storage or "",
            pregnancy_notes=m.pregnancy_notes or "",
            precautions=m.precautions or "",
            mode_of_action=m.mode_of_action or "",
        )

    @staticmethod
    def _brand_to_domain(m: BrandMedicineModel) -> BrandMedicine:
        return BrandMedicine(
            id=m.id,
            generic_id=m.generic_id,
            brand_name=m.brand_name,
            manufacturer=m.manufacturer,
            strength=m.strength,
            form=m.form,
            mrp=float(m.mrp) if m.mrp is not None else None,
            product_code=m.product_code or "",
            is_active=m.is_active,
        )

from typing import List, Optional
from uuid import UUID

from django.db.models import Q

from domain.entities.medicine import BrandMedicine, GenericMedicine
from domain.repositories.i_medicine_repository import IMedicineRepository
from infrastructure.orm.models.medicine_model import BrandMedicineModel, GenericMedicineModel


class DjangoMedicineRepository(IMedicineRepository):

    def search_brands(self, query: str, limit: int = 10) -> List[BrandMedicine]:
        qs = BrandMedicineModel.objects.select_related("generic").filter(
            Q(brand_name__icontains=query) | Q(generic__generic_name__icontains=query),
            is_active=True,
        )[:limit]
        return [self._brand_to_domain(m) for m in qs]

    def get_brand_by_id(self, medicine_id: UUID) -> Optional[BrandMedicine]:
        try:
            return self._brand_to_domain(BrandMedicineModel.objects.get(id=medicine_id))
        except BrandMedicineModel.DoesNotExist:
            return None

    def get_generics_by_class(self, drug_class: str) -> List[GenericMedicine]:
        qs = GenericMedicineModel.objects.filter(drug_class__icontains=drug_class)
        return [self._generic_to_domain(m) for m in qs]

    @staticmethod
    def _brand_to_domain(m: BrandMedicineModel) -> BrandMedicine:
        return BrandMedicine(
            id=m.id,
            generic_id=m.generic_id,
            brand_name=m.brand_name,
            manufacturer=m.manufacturer,
            strength=m.strength,
            form=m.form,
            is_active=m.is_active,
        )

    @staticmethod
    def _generic_to_domain(m: GenericMedicineModel) -> GenericMedicine:
        return GenericMedicine(
            id=m.id,
            generic_name=m.generic_name,
            drug_class=m.drug_class,
            contraindications=m.contraindications or [],
        )

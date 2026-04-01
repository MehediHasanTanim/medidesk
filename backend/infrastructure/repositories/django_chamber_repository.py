from typing import List, Optional
from uuid import UUID

from domain.entities.user import Chamber
from domain.repositories.i_chamber_repository import IChamberRepository
from infrastructure.orm.models.user_model import ChamberModel


class DjangoChamberRepository(IChamberRepository):

    def get_by_id(self, chamber_id: UUID) -> Optional[Chamber]:
        try:
            return self._to_domain(ChamberModel.objects.get(id=chamber_id))
        except ChamberModel.DoesNotExist:
            return None

    def list_all(self, active_only: bool = True) -> List[Chamber]:
        qs = ChamberModel.objects.order_by("name")
        if active_only:
            qs = qs.filter(is_active=True)
        return [self._to_domain(m) for m in qs]

    def save(self, chamber: Chamber) -> Chamber:
        model, _ = ChamberModel.objects.update_or_create(
            id=chamber.id,
            defaults={
                "name": chamber.name,
                "address": chamber.address,
                "phone": chamber.phone,
                "is_active": chamber.is_active,
            },
        )
        return self._to_domain(model)

    @staticmethod
    def _to_domain(model: ChamberModel) -> Chamber:
        return Chamber(
            id=model.id,
            name=model.name,
            address=model.address,
            phone=model.phone,
            is_active=model.is_active,
        )

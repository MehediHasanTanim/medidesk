from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.entities.user import Chamber


class IChamberRepository(ABC):

    @abstractmethod
    def get_by_id(self, chamber_id: UUID) -> Optional[Chamber]: ...

    @abstractmethod
    def list_all(self, active_only: bool = True) -> List[Chamber]: ...

    @abstractmethod
    def save(self, chamber: Chamber) -> Chamber: ...

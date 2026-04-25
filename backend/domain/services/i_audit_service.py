from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID


class IAuditService(ABC):

    @abstractmethod
    def log(
        self,
        action: str,
        resource_type: str,
        resource_id: str,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        payload: Optional[dict] = None,
    ) -> None: ...

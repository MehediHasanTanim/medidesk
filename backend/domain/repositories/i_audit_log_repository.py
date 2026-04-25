from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID

from domain.entities.audit_log import AuditLog


@dataclass
class AuditLogFilters:
    user_id: Optional[UUID] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = 1
    page_size: int = 50


class IAuditLogRepository(ABC):

    @abstractmethod
    def save(self, log: AuditLog) -> AuditLog: ...

    @abstractmethod
    def list(self, filters: AuditLogFilters) -> tuple[list[AuditLog], int]: ...

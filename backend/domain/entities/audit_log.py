from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class AuditLog:
    id: UUID
    user_id: Optional[UUID]
    action: str               # CREATE | UPDATE | DELETE | VIEW | LOGIN | LOGOUT
    resource_type: str
    resource_id: str
    payload: dict = field(default_factory=dict)
    ip_address: Optional[str] = None
    timestamp: Optional[datetime] = None

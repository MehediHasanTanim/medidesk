from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class AuditLogResponseDTO:
    id: str
    user_id: Optional[str]
    user_name: Optional[str]       # denormalized for display
    action: str
    resource_type: str
    resource_id: str
    payload: dict = field(default_factory=dict)
    ip_address: Optional[str] = None
    timestamp: Optional[str] = None  # ISO 8601


@dataclass
class AuditLogListResponseDTO:
    results: List[AuditLogResponseDTO]
    count: int
    page: int
    page_size: int

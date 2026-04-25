import logging
import uuid
from typing import Optional
from uuid import UUID

from domain.entities.audit_log import AuditLog
from domain.services.i_audit_service import IAuditService
from infrastructure.repositories.django_audit_log_repository import DjangoAuditLogRepository

logger = logging.getLogger(__name__)


class AuditService(IAuditService):

    def __init__(self) -> None:
        self._repo = DjangoAuditLogRepository()

    def log(
        self,
        action: str,
        resource_type: str,
        resource_id: str,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        payload: Optional[dict] = None,
    ) -> None:
        try:
            self._repo.save(AuditLog(
                id=uuid.uuid4(),
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                payload=payload or {},
                ip_address=ip_address,
            ))
        except Exception:
            logger.exception(
                "Audit log write failed — action=%s resource_type=%s resource_id=%s",
                action, resource_type, resource_id,
            )


def get_audit_service() -> AuditService:
    return AuditService()

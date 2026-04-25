import uuid
from typing import Optional

from domain.entities.audit_log import AuditLog
from domain.repositories.i_audit_log_repository import AuditLogFilters, IAuditLogRepository
from infrastructure.orm.models.audit_log_model import AuditLogModel


class DjangoAuditLogRepository(IAuditLogRepository):

    def save(self, log: AuditLog) -> AuditLog:
        AuditLogModel.objects.create(
            id=log.id,
            user_id=log.user_id,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            payload=log.payload,
            ip_address=log.ip_address,
        )
        return log

    def list(self, filters: AuditLogFilters) -> tuple[list[AuditLog], int]:
        qs = AuditLogModel.objects.select_related("user").order_by("-timestamp")

        if filters.user_id:
            qs = qs.filter(user_id=filters.user_id)
        if filters.action:
            qs = qs.filter(action=filters.action)
        if filters.resource_type:
            qs = qs.filter(resource_type=filters.resource_type)
        if filters.resource_id:
            qs = qs.filter(resource_id=filters.resource_id)
        if filters.date_from:
            qs = qs.filter(timestamp__gte=filters.date_from)
        if filters.date_to:
            qs = qs.filter(timestamp__lte=filters.date_to)

        total = qs.count()
        offset = (filters.page - 1) * filters.page_size
        page_qs = qs[offset: offset + filters.page_size]

        return [self._to_domain(m) for m in page_qs], total

    @staticmethod
    def _to_domain(model: AuditLogModel) -> AuditLog:
        log = AuditLog(
            id=model.id,
            user_id=model.user_id,
            action=model.action,
            resource_type=model.resource_type,
            resource_id=model.resource_id,
            payload=model.payload,
            ip_address=model.ip_address,
            timestamp=model.timestamp,
        )
        # attach denormalized user_name for the use case layer
        if model.user_id is not None:
            log.user_name = model.user.get_full_name() or model.user.username  # type: ignore[attr-defined]
        else:
            log.user_name = None  # type: ignore[attr-defined]
        return log

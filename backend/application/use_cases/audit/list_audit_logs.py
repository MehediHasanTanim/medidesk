from application.dtos.audit_log_dto import AuditLogListResponseDTO, AuditLogResponseDTO
from domain.repositories.i_audit_log_repository import AuditLogFilters, IAuditLogRepository


class ListAuditLogsUseCase:
    def __init__(self, repo: IAuditLogRepository) -> None:
        self._repo = repo

    def execute(self, filters: AuditLogFilters) -> AuditLogListResponseDTO:
        logs, total = self._repo.list(filters)

        results = [
            AuditLogResponseDTO(
                id=str(log.id),
                user_id=str(log.user_id) if log.user_id else None,
                user_name=getattr(log, "user_name", None),
                action=log.action,
                resource_type=log.resource_type,
                resource_id=log.resource_id,
                payload=log.payload,
                ip_address=log.ip_address,
                timestamp=log.timestamp.isoformat() if log.timestamp else None,
            )
            for log in logs
        ]

        return AuditLogListResponseDTO(
            results=results,
            count=total,
            page=filters.page,
            page_size=filters.page_size,
        )

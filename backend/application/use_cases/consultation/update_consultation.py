import uuid

from domain.entities.consultation import Consultation
from domain.repositories.i_consultation_repository import IConsultationRepository
from application.dtos.consultation_dto import UpdateConsultationDTO


class UpdateConsultationUseCase:
    """
    Patch the textual fields of a draft consultation.
    Raises ValueError if the consultation is already completed.
    """

    def __init__(self, repo: IConsultationRepository) -> None:
        self._repo = repo

    def execute(self, dto: UpdateConsultationDTO) -> Consultation:
        consultation = self._repo.get_by_id(uuid.UUID(dto.consultation_id))
        if not consultation:
            raise ValueError("Consultation not found")
        if not consultation.is_draft:
            raise ValueError("Cannot update a completed consultation")

        if dto.chief_complaints is not None:
            consultation.chief_complaints = dto.chief_complaints
        if dto.clinical_findings is not None:
            consultation.clinical_findings = dto.clinical_findings
        if dto.diagnosis is not None:
            consultation.diagnosis = dto.diagnosis
        if dto.notes is not None:
            consultation.notes = dto.notes

        return self._repo.save(consultation)

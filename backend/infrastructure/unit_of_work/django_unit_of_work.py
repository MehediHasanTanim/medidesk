from django.db import transaction

from domain.repositories.i_unit_of_work import IUnitOfWork
from infrastructure.repositories.django_appointment_repository import DjangoAppointmentRepository
from infrastructure.repositories.django_billing_repository import DjangoBillingRepository
from infrastructure.repositories.django_chamber_repository import DjangoChamberRepository
from infrastructure.repositories.django_consultation_repository import DjangoConsultationRepository
from infrastructure.repositories.django_medicine_repository import DjangoMedicineRepository
from infrastructure.repositories.django_patient_repository import DjangoPatientRepository
from infrastructure.repositories.django_prescription_repository import DjangoPrescriptionRepository
from infrastructure.repositories.django_audit_log_repository import DjangoAuditLogRepository
from infrastructure.repositories.django_user_repository import DjangoUserRepository


class DjangoUnitOfWork(IUnitOfWork):
    """
    Wraps all repository access inside a single Django atomic transaction.

    Usage:
        with DjangoUnitOfWork() as uow:
            user = uow.users.get_by_id(user_id)
            uow.patients.save(patient)
            uow.commit()
    """

    def __enter__(self) -> "DjangoUnitOfWork":
        self._atomic = transaction.atomic()
        self._atomic.__enter__()
        self.users = DjangoUserRepository()
        self.chambers = DjangoChamberRepository()
        self.patients = DjangoPatientRepository()
        self.appointments = DjangoAppointmentRepository()
        self.consultations = DjangoConsultationRepository()
        self.prescriptions = DjangoPrescriptionRepository()
        self.billing = DjangoBillingRepository()
        self.medicines = DjangoMedicineRepository()
        self.audit_logs = DjangoAuditLogRepository()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.rollback()
        self._atomic.__exit__(exc_type, exc_val, exc_tb)

    def commit(self) -> None:
        pass  # Django commits at end of clean atomic block

    def rollback(self) -> None:
        transaction.set_rollback(True)

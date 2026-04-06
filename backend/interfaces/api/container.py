"""
Dependency Injection Container.
Wires use cases with their concrete infrastructure implementations.
"""
from infrastructure.services.email_service import EmailNotificationService
from infrastructure.services.notification_composite import CompositeNotificationService
from infrastructure.services.whatsapp_service import WhatsAppNotificationService
from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork
from infrastructure.repositories.django_doctor_repository import DjangoDoctorRepository
from application.use_cases.appointment.book_appointment import BookAppointmentUseCase
from application.use_cases.consultation.complete_consultation import CompleteConsultationUseCase
from application.use_cases.patient.register_patient import RegisterPatientUseCase
from application.use_cases.patient.update_patient import UpdatePatientUseCase
from application.use_cases.doctor.manage_speciality import (
    ListSpecialitiesUseCase,
    CreateSpecialityUseCase,
    UpdateSpecialityUseCase,
    DeleteSpecialityUseCase,
)
from application.use_cases.doctor.manage_doctor_profile import (
    ListDoctorProfilesUseCase,
    GetDoctorProfileUseCase,
    CreateDoctorProfileUseCase,
    UpdateDoctorProfileUseCase,
)


class Container:

    @staticmethod
    def notification_service() -> CompositeNotificationService:
        return CompositeNotificationService([
            WhatsAppNotificationService(),
            EmailNotificationService(),
        ])

    @staticmethod
    def register_patient() -> RegisterPatientUseCase:
        return RegisterPatientUseCase(uow=DjangoUnitOfWork())

    @staticmethod
    def update_patient() -> UpdatePatientUseCase:
        return UpdatePatientUseCase(uow=DjangoUnitOfWork())

    @staticmethod
    def book_appointment() -> BookAppointmentUseCase:
        return BookAppointmentUseCase(
            uow=DjangoUnitOfWork(),
            notification_service=Container.notification_service(),
        )

    @staticmethod
    def complete_consultation() -> CompleteConsultationUseCase:
        return CompleteConsultationUseCase(uow=DjangoUnitOfWork())

    # ── Doctor / Speciality ───────────────────────────────────────────────────

    @staticmethod
    def _doctor_repo() -> DjangoDoctorRepository:
        return DjangoDoctorRepository()

    @staticmethod
    def list_specialities() -> ListSpecialitiesUseCase:
        return ListSpecialitiesUseCase(repo=Container._doctor_repo())

    @staticmethod
    def create_speciality() -> CreateSpecialityUseCase:
        return CreateSpecialityUseCase(repo=Container._doctor_repo())

    @staticmethod
    def update_speciality() -> UpdateSpecialityUseCase:
        return UpdateSpecialityUseCase(repo=Container._doctor_repo())

    @staticmethod
    def delete_speciality() -> DeleteSpecialityUseCase:
        return DeleteSpecialityUseCase(repo=Container._doctor_repo())

    @staticmethod
    def list_doctor_profiles() -> ListDoctorProfilesUseCase:
        return ListDoctorProfilesUseCase(repo=Container._doctor_repo())

    @staticmethod
    def get_doctor_profile() -> GetDoctorProfileUseCase:
        return GetDoctorProfileUseCase(repo=Container._doctor_repo())

    @staticmethod
    def create_doctor_profile() -> CreateDoctorProfileUseCase:
        return CreateDoctorProfileUseCase(repo=Container._doctor_repo())

    @staticmethod
    def update_doctor_profile() -> UpdateDoctorProfileUseCase:
        return UpdateDoctorProfileUseCase(repo=Container._doctor_repo())

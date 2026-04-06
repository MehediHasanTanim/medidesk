"""
Dependency Injection Container.
Wires use cases with their concrete infrastructure implementations.
"""
from infrastructure.services.email_service import EmailNotificationService
from infrastructure.services.notification_composite import CompositeNotificationService
from infrastructure.services.whatsapp_service import WhatsAppNotificationService
from infrastructure.unit_of_work.django_unit_of_work import DjangoUnitOfWork
from application.use_cases.appointment.book_appointment import BookAppointmentUseCase
from application.use_cases.consultation.complete_consultation import CompleteConsultationUseCase
from application.use_cases.patient.register_patient import RegisterPatientUseCase
from application.use_cases.patient.update_patient import UpdatePatientUseCase


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

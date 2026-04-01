from abc import ABC, abstractmethod

from domain.repositories.i_appointment_repository import IAppointmentRepository
from domain.repositories.i_billing_repository import IBillingRepository
from domain.repositories.i_chamber_repository import IChamberRepository
from domain.repositories.i_consultation_repository import IConsultationRepository
from domain.repositories.i_medicine_repository import IMedicineRepository
from domain.repositories.i_patient_repository import IPatientRepository
from domain.repositories.i_prescription_repository import IPrescriptionRepository
from domain.repositories.i_user_repository import IUserRepository


class IUnitOfWork(ABC):
    users: IUserRepository
    chambers: IChamberRepository
    patients: IPatientRepository
    appointments: IAppointmentRepository
    consultations: IConsultationRepository
    prescriptions: IPrescriptionRepository
    billing: IBillingRepository
    medicines: IMedicineRepository

    @abstractmethod
    def __enter__(self) -> "IUnitOfWork": ...

    @abstractmethod
    def __exit__(self, exc_type, exc_val, exc_tb): ...

    @abstractmethod
    def commit(self) -> None: ...

    @abstractmethod
    def rollback(self) -> None: ...

import uuid
from datetime import datetime

from domain.entities.patient import Patient
from domain.repositories.i_unit_of_work import IUnitOfWork
from domain.value_objects.phone_number import PhoneNumber
from application.dtos.patient_dto import PatientResponseDTO, RegisterPatientDTO


class RegisterPatientUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: RegisterPatientDTO) -> PatientResponseDTO:
        phone = PhoneNumber(dto.phone)

        with self._uow:
            existing = self._uow.patients.get_by_phone(phone)
            if existing:
                raise ValueError(
                    f"Patient with phone {dto.phone} already exists "
                    f"(Patient ID: {existing.patient_id})"
                )

            dob = datetime.strptime(dto.date_of_birth, "%Y-%m-%d").date() if dto.date_of_birth else None
            patient_id = self._next_patient_id()

            patient = Patient(
                id=uuid.uuid4(),
                patient_id=patient_id,
                full_name=dto.full_name.strip(),
                phone=phone,
                gender=dto.gender,
                address=dto.address,
                date_of_birth=dob,
                email=dto.email,
                national_id=dto.national_id,
                allergies=dto.allergies or [],
                chronic_diseases=dto.chronic_diseases or [],
                family_history=dto.family_history,
            )
            saved = self._uow.patients.save(patient)
            self._uow.commit()

        return PatientResponseDTO(
            id=str(saved.id),
            patient_id=saved.patient_id,
            full_name=saved.full_name,
            phone=str(saved.phone),
            gender=saved.gender,
            address=saved.address,
            age=saved.age,
            email=saved.email,
            allergies=saved.allergies,
            chronic_diseases=saved.chronic_diseases,
            family_history=saved.family_history,
        )

    @staticmethod
    def _next_patient_id() -> str:
        from infrastructure.orm.models.patient_model import PatientModel
        count = PatientModel.objects.count()
        return f"MED-{str(count + 1).zfill(5)}"

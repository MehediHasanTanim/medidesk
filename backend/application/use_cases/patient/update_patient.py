from datetime import datetime
from uuid import UUID

from domain.repositories.i_unit_of_work import IUnitOfWork
from domain.value_objects.phone_number import PhoneNumber
from application.dtos.patient_dto import PatientResponseDTO, UpdatePatientDTO


class UpdatePatientUseCase:

    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: UpdatePatientDTO) -> PatientResponseDTO:
        with self._uow:
            patient = self._uow.patients.get_by_id(UUID(dto.patient_id))
            if not patient:
                raise ValueError("Patient not found")

            if dto.full_name is not None:
                patient.full_name = dto.full_name.strip()
            if dto.phone is not None:
                # Phone is not unique — multiple patients (e.g. children) may share a number.
                patient.phone = PhoneNumber(dto.phone)
            if dto.gender is not None:
                patient.gender = dto.gender
            if dto.address is not None:
                patient.address = dto.address
            if dto.date_of_birth is not None:
                patient.date_of_birth = (
                    datetime.strptime(dto.date_of_birth, "%Y-%m-%d").date()
                )
                # DOB is now set — discard the manual fallback
                patient.age_years = None
            if dto.age_years is not None and not patient.date_of_birth:
                patient.age_years = dto.age_years
            if dto.email is not None:
                patient.email = dto.email
            if dto.national_id is not None:
                patient.national_id = dto.national_id
            if dto.allergies is not None:
                patient.allergies = dto.allergies
            if dto.chronic_diseases is not None:
                patient.chronic_diseases = dto.chronic_diseases
            if dto.family_history is not None:
                patient.family_history = dto.family_history

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
            date_of_birth=str(saved.date_of_birth) if saved.date_of_birth else None,
            email=saved.email,
            national_id=saved.national_id,
            allergies=saved.allergies,
            chronic_diseases=saved.chronic_diseases,
            family_history=saved.family_history,
        )

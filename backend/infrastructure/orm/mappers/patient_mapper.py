from domain.entities.patient import Patient
from domain.value_objects.phone_number import PhoneNumber
from infrastructure.orm.models.patient_model import PatientModel


class PatientMapper:

    @staticmethod
    def to_domain(model: PatientModel) -> Patient:
        return Patient(
            id=model.id,
            patient_id=model.patient_id,
            full_name=model.full_name,
            phone=PhoneNumber(model.phone),
            gender=model.gender,
            address=model.address,
            date_of_birth=model.date_of_birth,
            email=model.email,
            national_id=model.national_id,
            allergies=model.allergies or [],
            chronic_diseases=model.chronic_diseases or [],
            family_history=model.family_history,
            is_active=model.is_active,
            created_at=model.created_at.date() if model.created_at else None,
        )

    @staticmethod
    def to_model_data(entity: Patient) -> dict:
        return {
            "patient_id": entity.patient_id,
            "full_name": entity.full_name,
            "phone": str(entity.phone),
            "gender": entity.gender,
            "address": entity.address,
            "date_of_birth": entity.date_of_birth,
            "email": entity.email,
            "national_id": entity.national_id,
            "allergies": entity.allergies,
            "chronic_diseases": entity.chronic_diseases,
            "family_history": entity.family_history,
            "is_active": entity.is_active,
        }

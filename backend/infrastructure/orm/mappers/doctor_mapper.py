from domain.entities.doctor import DoctorProfile, Speciality
from infrastructure.orm.models.doctor_model import DoctorProfileModel, SpecialityModel


class SpecialityMapper:

    @staticmethod
    def to_domain(model: SpecialityModel) -> Speciality:
        return Speciality(
            id=model.id,
            name=model.name,
            description=model.description,
            is_active=model.is_active,
        )

    @staticmethod
    def to_model_data(entity: Speciality) -> dict:
        return {
            "name": entity.name,
            "description": entity.description,
            "is_active": entity.is_active,
        }


class DoctorProfileMapper:

    @staticmethod
    def to_domain(model: DoctorProfileModel) -> DoctorProfile:
        return DoctorProfile(
            id=model.id,
            user_id=model.user_id,
            speciality_id=model.speciality_id,
            qualifications=model.qualifications,
            bio=model.bio,
            consultation_fee=model.consultation_fee,
            experience_years=model.experience_years,
            is_available=model.is_available,
            visit_days=model.visit_days or [],
            visit_time_start=model.visit_time_start,
            visit_time_end=model.visit_time_end,
        )

    @staticmethod
    def to_model_data(entity: DoctorProfile) -> dict:
        return {
            "user_id": entity.user_id,
            "speciality_id": entity.speciality_id,
            "qualifications": entity.qualifications,
            "bio": entity.bio,
            "consultation_fee": entity.consultation_fee,
            "experience_years": entity.experience_years,
            "is_available": entity.is_available,
            "visit_days": entity.visit_days,
            "visit_time_start": entity.visit_time_start,
            "visit_time_end": entity.visit_time_end,
        }

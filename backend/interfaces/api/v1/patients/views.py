import uuid

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.patient_dto import RegisterPatientDTO
from interfaces.api.container import Container
from interfaces.api.v1.patients.serializers import PatientResponseSerializer, RegisterPatientSerializer
from interfaces.permissions import RolePermission


class PatientRegistrationView(APIView):
    permission_classes = [IsAuthenticated, RolePermission(["doctor", "receptionist", "assistant"])]

    def post(self, request: Request) -> Response:
        serializer = RegisterPatientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        dto_data = serializer.validated_data
        if dto_data.get("date_of_birth"):
            dto_data["date_of_birth"] = str(dto_data["date_of_birth"])

        use_case = Container.register_patient()
        try:
            result = use_case.execute(RegisterPatientDTO(**dto_data))
            return Response(PatientResponseSerializer(result.__dict__).data, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_409_CONFLICT)


class PatientSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        query = request.query_params.get("q", "")
        limit = min(int(request.query_params.get("limit", 20)), 100)
        offset = int(request.query_params.get("offset", 0))

        from infrastructure.repositories.django_patient_repository import DjangoPatientRepository
        repo = DjangoPatientRepository()
        patients = repo.search(query, limit=limit, offset=offset) if query else repo.list_all(limit, offset)
        return Response({
            "results": [PatientResponseSerializer(p.__dict__).data for p in patients],
            "limit": limit,
            "offset": offset,
        })


class PatientDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, patient_id: uuid.UUID) -> Response:
        from infrastructure.repositories.django_patient_repository import DjangoPatientRepository
        patient = DjangoPatientRepository().get_by_id(patient_id)
        if not patient:
            return Response({"error": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientResponseSerializer(patient.__dict__).data)

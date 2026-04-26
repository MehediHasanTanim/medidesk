# API View Pattern

## Standard view skeleton
```python
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from interfaces.permissions import ModulePermission, RolePermission
from interfaces.api.container import Container
from interfaces.api.v1.mixins import AuditMixin

class AppointmentListView(AuditMixin, APIView):
    permission_classes = [IsAuthenticated, ModulePermission("appointments")]

    def get(self, request: Request) -> Response:
        # Validate with serializer
        serializer = AppointmentFilterSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        # Instantiate and execute use case
        use_case = Container.list_appointments_use_case()
        results = use_case.execute(serializer.validated_data, request.user)
        return Response(AppointmentResponseSerializer(results, many=True).data)

    def post(self, request: Request) -> Response:
        serializer = BookAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dto = BookAppointmentDTO(**serializer.validated_data, created_by_id=str(request.user.id))
        use_case = Container.book_appointment_use_case()
        try:
            result = use_case.execute(dto)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        self.log_audit(request, "appointment", str(result.id), "create")
        return Response(AppointmentResponseSerializer(result.__dict__).data, status=status.HTTP_201_CREATED)
```

## URL patterns
```
/api/v1/{resource}/                     # list / create  → {Resource}ListView
/api/v1/{resource}/{id}/                # retrieve / update / delete  → {Resource}DetailView
/api/v1/{resource}/{id}/{action}/       # custom actions (POST)
```

## Serializers
- **Request serializers**: validate only, never query DB
- **Response serializers**: read-only fields on DTOs or dicts
- Use `@extend_schema` from `drf_spectacular` on every method for Swagger docs

## Error responses
| Cause | Status | Body |
|---|---|---|
| Validation | 400 | `{"field": ["error"]}` (DRF default) |
| Domain rule violation | 400 | `{"error": "message"}` |
| Slot conflict | 409 | `{"error": "message"}` |
| Not found | 404 | `{"error": "Not found"}` |
| Permission denied | 403 | `{"error": "Access denied"}` |

## Container
`backend/interfaces/api/container.py` — factory methods that wire UoW + services into use cases.
Never instantiate use cases directly in views without going through Container.

## AuditMixin
Inherit from `AuditMixin` alongside `APIView`. Call `self.log_audit(request, resource, resource_id, action)` after successful writes.

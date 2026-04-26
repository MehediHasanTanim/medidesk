# New Feature Scaffold

Copy-paste skeleton for a complete new feature. Replace `<Entity>`, `<entity>`, `<module>` throughout.

---

## File list to create

```
backend/domain/entities/<entity>.py
backend/domain/repositories/i_<entity>_repository.py
backend/infrastructure/orm/models/<entity>_model.py
backend/infrastructure/repositories/django_<entity>_repository.py
backend/application/dtos/<entity>_dto.py
backend/application/use_cases/<entity>/create_<entity>.py
backend/application/use_cases/<entity>/__init__.py
backend/interfaces/api/v1/<entity>/__init__.py
backend/interfaces/api/v1/<entity>/views.py
backend/interfaces/api/v1/<entity>/serializers.py
backend/interfaces/api/v1/<entity>/urls.py
frontend/src/features/<feature>/api/<feature>Api.ts
frontend/src/features/<feature>/pages/<Feature>Page.tsx
```

---

## `domain/entities/<entity>.py`
```python
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class <Entity>Status(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"


@dataclass
class <Entity>:
    id: uuid.UUID
    name: str
    status: <Entity>Status = <Entity>Status.PENDING
    created_at: Optional[str] = None

    def activate(self) -> None:
        if self.status != <Entity>Status.PENDING:
            raise ValueError("Can only activate pending <entity>")
        self.status = <Entity>Status.ACTIVE
```

---

## `domain/repositories/i_<entity>_repository.py`
```python
import uuid
from abc import ABC, abstractmethod
from typing import Optional
from domain.entities.<entity> import <Entity>


class I<Entity>Repository(ABC):
    @abstractmethod
    def get_by_id(self, entity_id: uuid.UUID) -> Optional[<Entity>]: ...

    @abstractmethod
    def save(self, entity: <Entity>) -> <Entity>: ...

    @abstractmethod
    def list_all(self) -> list[<Entity>]: ...
```

---

## `infrastructure/orm/models/<entity>_model.py`
```python
import uuid
from django.db import models


class <Entity>Model(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("active", "Active")],
        default="pending",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "infrastructure"
        db_table = "<table_name_plural>"
```

---

## `infrastructure/repositories/django_<entity>_repository.py`
```python
import uuid
from typing import Optional
from domain.entities.<entity> import <Entity>, <Entity>Status
from domain.repositories.i_<entity>_repository import I<Entity>Repository
from infrastructure.orm.models.<entity>_model import <Entity>Model


class Django<Entity>Repository(I<Entity>Repository):

    @staticmethod
    def _to_domain(obj: <Entity>Model) -> <Entity>:
        return <Entity>(
            id=obj.id,
            name=obj.name,
            status=<Entity>Status(obj.status),
            created_at=obj.created_at.isoformat() if obj.created_at else None,
        )

    def get_by_id(self, entity_id: uuid.UUID) -> Optional[<Entity>]:
        try:
            return self._to_domain(<Entity>Model.objects.get(id=entity_id))
        except <Entity>Model.DoesNotExist:
            return None

    def save(self, entity: <Entity>) -> <Entity>:
        obj, _ = <Entity>Model.objects.update_or_create(
            id=entity.id,
            defaults={"name": entity.name, "status": entity.status.value},
        )
        return self._to_domain(obj)

    def list_all(self) -> list[<Entity>]:
        return [self._to_domain(obj) for obj in <Entity>Model.objects.all()]
```

---

## `application/dtos/<entity>_dto.py`
```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class Create<Entity>DTO:
    name: str
    created_by_id: Optional[str] = None


@dataclass
class <Entity>ResponseDTO:
    id: str
    name: str
    status: str
    created_at: Optional[str] = None
```

---

## `application/use_cases/<entity>/create_<entity>.py`
```python
import uuid
import logging
from domain.entities.<entity> import <Entity>
from domain.repositories.i_unit_of_work import IUnitOfWork
from application.dtos.<entity>_dto import Create<Entity>DTO, <Entity>ResponseDTO

logger = logging.getLogger(__name__)


class Create<Entity>UseCase:
    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: Create<Entity>DTO) -> <Entity>ResponseDTO:
        with self._uow:
            entity = <Entity>(id=uuid.uuid4(), name=dto.name)
            saved = self._uow.<entities>.save(entity)
            self._uow.commit()
        return <Entity>ResponseDTO(
            id=str(saved.id),
            name=saved.name,
            status=saved.status.value,
            created_at=saved.created_at,
        )
```

---

## `interfaces/api/v1/<entity>/serializers.py`
```python
from rest_framework import serializers


class Create<Entity>Serializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)


class <Entity>ResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    status = serializers.CharField()
    created_at = serializers.CharField(allow_null=True)
```

---

## `interfaces/api/v1/<entity>/views.py`
```python
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from application.dtos.<entity>_dto import Create<Entity>DTO
from interfaces.api.container import Container
from interfaces.api.v1.<entity>.serializers import Create<Entity>Serializer, <Entity>ResponseSerializer
from interfaces.api.v1.mixins import AuditMixin
from interfaces.permissions import ModulePermission


class <Entity>ListView(AuditMixin, APIView):
    permission_classes = [IsAuthenticated, ModulePermission("<module>")]

    @extend_schema(responses={200: <Entity>ResponseSerializer(many=True)})
    def get(self, request: Request) -> Response:
        entities = Container.list_<entities>().execute()
        return Response(<Entity>ResponseSerializer([e.__dict__ for e in entities], many=True).data)

    @extend_schema(request=Create<Entity>Serializer, responses={201: <Entity>ResponseSerializer})
    def post(self, request: Request) -> Response:
        ser = Create<Entity>Serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        dto = Create<Entity>DTO(**ser.validated_data, created_by_id=str(request.user.id))
        try:
            result = Container.create_<entity>().execute(dto)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        self.log_audit(request, "<module>", result.id, "create")
        return Response(<Entity>ResponseSerializer(result.__dict__).data, status=status.HTTP_201_CREATED)
```

---

## `interfaces/api/v1/<entity>/urls.py`
```python
from django.urls import path
from interfaces.api.v1.<entity>.views import <Entity>ListView, <Entity>DetailView

urlpatterns = [
    path("", <Entity>ListView.as_view(), name="<entity>-list"),
    path("<uuid:pk>/", <Entity>DetailView.as_view(), name="<entity>-detail"),
]
```

---

## `frontend/src/features/<feature>/api/<feature>Api.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/shared/lib/apiClient";

export interface <Entity> {
  id: string;
  name: string;
  status: string;
  created_at: string | null;
}

export interface Create<Entity>Payload {
  name: string;
}

const KEYS = {
  list: () => ["<entities>"] as const,
  detail: (id: string) => ["<entities>", id] as const,
};

export function use<Entities>() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: () => apiClient.get<<Entity>[]>("/<entities>/").then(r => r.data),
  });
}

export function useCreate<Entity>() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Create<Entity>Payload) =>
      apiClient.post<<Entity>>("/<entities>/", payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.list() }),
  });
}
```

---

## Wiring checklist after scaffolding

- [ ] Add `self.<entities> = Django<Entity>Repository()` to `DjangoUnitOfWork.__enter__`
- [ ] Add `<entities>: I<Entity>Repository` to `IUnitOfWork` ABC
- [ ] Add factory methods to `Container`
- [ ] Register URL in `interfaces/api/v1/urls.py`
- [ ] Add module to `ROLE_PERMISSIONS` in `permissions.py` for each applicable role
- [ ] Add route to `App.tsx` with `<RoleGuard>`
- [ ] Add nav link to `AppShell.tsx` if top-level page
- [ ] Run `makemigrations` + `migrate`

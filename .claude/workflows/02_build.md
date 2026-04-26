# 02 — BUILD

Layer-by-layer build order. Always work inside → out: domain first, interface last.

---

## Build order (never skip, never reverse)

```
1. Domain          entity · value object · repo interface
2. Infrastructure  ORM model · migration · repo implementation
3. Application     use case · DTOs
4. Interface       container · view · serializer · URL
5. Frontend        api module · page/component · RoleGuard
```

---

## Layer 1 — Domain

### Entity (`backend/domain/entities/<entity>.py`)
```python
@dataclass
class NewEntity:
    id: uuid.UUID
    # ... fields using value objects where applicable (Money, PhoneNumber, etc.)
    status: NewEntityStatus = NewEntityStatus.PENDING

    def transition_to_active(self) -> None:
        if self.status != NewEntityStatus.PENDING:
            raise ValueError("Can only activate pending entities")
        self.status = NewEntityStatus.ACTIVE
```

- Use `@dataclass`, no Django imports
- Status transitions are methods on the entity, not in use cases
- Money → always `Money(amount, currency="BDT")`
- Phone → always `PhoneNumber` value object

### Repository interface (`backend/domain/repositories/i_<entity>_repository.py`)
```python
from abc import ABC, abstractmethod
class INewEntityRepository(ABC):
    @abstractmethod
    def get_by_id(self, entity_id: uuid.UUID) -> Optional[NewEntity]: ...
    @abstractmethod
    def save(self, entity: NewEntity) -> NewEntity: ...
    @abstractmethod
    def list_by_<filter>(self, ...) -> list[NewEntity]: ...
```

---

## Layer 2 — Infrastructure

### ORM model (`backend/infrastructure/orm/models/<entity>_model.py`)
```python
from django.db import models

class NewEntityModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    status = models.CharField(max_length=20, choices=[...], default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "infrastructure"   # REQUIRED — always
        db_table = "<table_name>"
```

After creating/modifying:
```bash
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
```

### Repository implementation (`backend/infrastructure/repositories/django_<entity>_repository.py`)
```python
class DjangoNewEntityRepository(INewEntityRepository):
    @staticmethod
    def _to_domain(obj: NewEntityModel) -> NewEntity:
        return NewEntity(id=obj.id, ...)

    def get_by_id(self, entity_id: uuid.UUID) -> Optional[NewEntity]:
        try:
            return self._to_domain(NewEntityModel.objects.get(id=entity_id))
        except NewEntityModel.DoesNotExist:
            return None

    def save(self, entity: NewEntity) -> NewEntity:
        obj, _ = NewEntityModel.objects.update_or_create(
            id=entity.id,
            defaults={...}
        )
        return self._to_domain(obj)
```

### Wire into UoW (only if new entity)
In `backend/infrastructure/unit_of_work/django_unit_of_work.py`:
```python
# Add import
from infrastructure.repositories.django_new_entity_repository import DjangoNewEntityRepository
# Add in __enter__
self.new_entities = DjangoNewEntityRepository()
```

---

## Layer 3 — Application

### DTOs (`backend/application/dtos/<entity>_dto.py`)
```python
@dataclass
class CreateNewEntityDTO:
    name: str
    amount: str        # string from HTTP, convert to Decimal in use case
    created_by_id: str # UUID as string

@dataclass
class NewEntityResponseDTO:
    id: str
    name: str
    status: str
    created_at: str
```

### Use case (`backend/application/use_cases/<entity>/<verb>_<entity>.py`)
```python
class CreateNewEntityUseCase:
    def __init__(self, uow: IUnitOfWork) -> None:
        self._uow = uow

    def execute(self, dto: CreateNewEntityDTO) -> NewEntityResponseDTO:
        with self._uow:
            # 1. Validate / load dependencies
            # 2. Build domain entity
            entity = NewEntity(id=uuid.uuid4(), ...)
            # 3. Call domain methods (state transitions)
            # 4. Persist
            saved = self._uow.new_entities.save(entity)
            self._uow.commit()
        # 5. Side effects OUTSIDE transaction
        return NewEntityResponseDTO(id=str(saved.id), ...)
```

---

## Layer 4 — Interface

### Container (`backend/interfaces/api/container.py`)
```python
@staticmethod
def create_new_entity() -> CreateNewEntityUseCase:
    return CreateNewEntityUseCase(uow=DjangoUnitOfWork())
```

### Serializers (`backend/interfaces/api/v1/<entity>/serializers.py`)
```python
class CreateNewEntitySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)

class NewEntityResponseSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    status = serializers.CharField()
```

### View (`backend/interfaces/api/v1/<entity>/views.py`)
```python
class NewEntityListView(AuditMixin, APIView):
    permission_classes = [IsAuthenticated, ModulePermission("<module>")]

    @extend_schema(request=CreateNewEntitySerializer, responses={201: NewEntityResponseSerializer})
    def post(self, request: Request) -> Response:
        ser = CreateNewEntitySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        dto = CreateNewEntityDTO(**ser.validated_data, created_by_id=str(request.user.id))
        try:
            result = Container.create_new_entity().execute(dto)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        self.log_audit(request, "<module>", result.id, "create")
        return Response(NewEntityResponseSerializer(result.__dict__).data, status=status.HTTP_201_CREATED)
```

### URLs
In `backend/interfaces/api/v1/<entity>/urls.py`:
```python
urlpatterns = [
    path("", NewEntityListView.as_view(), name="new-entity-list"),
    path("<uuid:pk>/", NewEntityDetailView.as_view(), name="new-entity-detail"),
    path("<uuid:pk>/activate/", NewEntityActivateView.as_view(), name="new-entity-activate"),
]
```

Register in `backend/interfaces/api/v1/urls.py`:
```python
path("new-entities/", include("interfaces.api.v1.new_entity.urls")),
```

---

## Layer 5 — Frontend

### API module (`frontend/src/features/<feature>/api/<feature>Api.ts`)
```typescript
const KEYS = {
  list: (filters?: object) => ["new-entities", filters] as const,
  detail: (id: string) => ["new-entities", id] as const,
};

export function useNewEntities(filters?: Filters) {
  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: () => apiClient.get<NewEntity[]>("/new-entities/", { params: filters }).then(r => r.data),
  });
}

export function useCreateNewEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateNewEntityPayload) =>
      apiClient.post<NewEntity>("/new-entities/", payload).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["new-entities"] }),
  });
}
```

### Page (`frontend/src/features/<feature>/pages/<Feature>Page.tsx`)
```tsx
export default function NewEntityPage() {
  const { user, canAccess } = useAuthStore();
  const { data, isLoading } = useNewEntities();
  const createMutation = useCreateNewEntity();
  const { showToast } = useToast();

  const handleCreate = async (payload) => {
    try {
      await createMutation.mutateAsync(payload);
      showToast("Created successfully", "success");
    } catch {
      showToast("Failed to create", "error");
    }
  };
  // ...
}
```

### Route in `App.tsx`
```tsx
<Route path="/new-entities" element={
  <RoleGuard roles={["doctor", "admin"]}>
    <NewEntityPage />
  </RoleGuard>
} />
```

### AppShell nav link (if new top-level page)
Add to `frontend/src/shared/components/AppShell.tsx` nav array.

---

## RBAC — when to update `ROLE_PERMISSIONS`

Only needed for a **new module** (new top-level resource). For actions on existing modules, the existing matrix already covers it.

```python
# In backend/interfaces/permissions.py → ROLE_PERMISSIONS
"doctor": {
    ...
    "new_module": {"view", "create", "update"},
},
```

---

## Mid-build checklist

After each layer, before moving to the next:
- [ ] No `from django.*` in `domain/` or `application/`
- [ ] All new ORM models have `app_label = "infrastructure"`
- [ ] Migration created and applied
- [ ] All new repo methods return domain entities (never ORM objects)
- [ ] Notifications/Celery tasks are outside the `with self._uow:` block
- [ ] Every new view method has `@extend_schema`
- [ ] TypeScript compiles: `cd frontend && npx tsc --noEmit`

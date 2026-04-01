from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from domain.entities.user import User, UserRole


class IUserRepository(ABC):

    @abstractmethod
    def get_by_id(self, user_id: UUID) -> Optional[User]: ...

    @abstractmethod
    def get_by_username(self, username: str) -> Optional[User]: ...

    @abstractmethod
    def list_all(self, is_active: Optional[bool] = None) -> List[User]: ...

    @abstractmethod
    def list_by_role(self, role: UserRole) -> List[User]: ...

    @abstractmethod
    def save(self, user: User, password: Optional[str] = None) -> User: ...

    @abstractmethod
    def set_password(self, user_id: UUID, new_password: str) -> None: ...

    @abstractmethod
    def assign_chambers(self, user_id: UUID, chamber_ids: List[UUID]) -> None: ...

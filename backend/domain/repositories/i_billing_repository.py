from abc import ABC, abstractmethod
from datetime import date
from typing import List, Optional
from uuid import UUID

from domain.entities.billing import Invoice, Payment


class IBillingRepository(ABC):

    @abstractmethod
    def get_invoice_by_id(self, invoice_id: UUID) -> Optional[Invoice]: ...

    @abstractmethod
    def save_invoice(self, invoice: Invoice) -> Invoice: ...

    @abstractmethod
    def save_payment(self, payment: Payment) -> Payment: ...

    @abstractmethod
    def get_payments_by_invoice(self, invoice_id: UUID) -> List[Payment]: ...

    @abstractmethod
    def get_invoice_by_consultation(self, consultation_id: UUID) -> Optional[Invoice]: ...

    @abstractmethod
    def get_invoices_by_patient(self, patient_id: UUID, limit: int = 50) -> List[Invoice]: ...

    @abstractmethod
    def get_invoices_by_date_range(self, start: date, end: date) -> List[Invoice]: ...

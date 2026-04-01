from abc import ABC, abstractmethod


class IDocumentService(ABC):

    @abstractmethod
    def save_report(self, patient_id: str, filename: str, content: bytes) -> str: ...

    @abstractmethod
    def save_prescription_pdf(self, patient_id: str, rx_id: str, pdf_bytes: bytes) -> str: ...

    @abstractmethod
    def get_file_url(self, path: str) -> str: ...

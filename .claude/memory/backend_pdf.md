# PDF Generation

## Library
WeasyPrint (≥60.0) — produces PDFs from HTML + CSS.

## Pattern used in prescriptions and invoices
Use case: `backend/application/use_cases/prescription/generate_pdf.py`
Use case: `backend/application/use_cases/billing/generate_pdf.py`

```python
from weasyprint import HTML

class GeneratePrescriptionPdfUseCase:
    def execute(self, prescription_id: str) -> bytes:
        # 1. Load data via repo (outside UoW — read-only)
        # 2. Render HTML template with context
        html_content = render_to_string("prescription_pdf.html", context)
        # 3. Convert to PDF bytes
        pdf_bytes = HTML(string=html_content, base_url=settings.BASE_DIR).write_pdf()
        return pdf_bytes
```

## View pattern
```python
from django.http import HttpResponse

def get(self, request, pk):
    pdf_bytes = use_case.execute(str(pk))
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = 'inline; filename="prescription.pdf"'
    return response
```

## Templates
HTML templates for PDFs live in `backend/templates/` with `WeasyPrint`-compatible CSS.
Use `@page` CSS rule for page size/margins. Keep CSS inline or in `<style>` tags — external stylesheets need `base_url` set.

## Frontend usage
PDFs opened via `window.open(url)` for inline view, or anchor `href` with `download` attribute for download.
WhatsApp/email sharing: backend generates PDF → saves temporarily or returns base64 → sends via notification service.

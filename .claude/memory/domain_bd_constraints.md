# BD-Specific Constraints

These are hardcoded domain assumptions — never abstract them away.

## Currency
- BDT only. `Money` value object has `currency: str = "BDT"` hardcoded.
- No multi-currency support planned.
- Payment methods: Cash, bKash, Nagad, Card (`CASH | BKASH | NAGAD | CARD` enum).

## Timezone
- `Asia/Dhaka` in Django `TIME_ZONE` and Celery `CELERY_TIMEZONE`.
- All timestamps stored UTC in DB, displayed in BD local time in UI.
- Never store local time — always UTC.

## Phone number
- Primary patient identifier (not name).
- BD format: `880XXXXXXXXXX` or `01[3-9]XXXXXXXX`.
- Validated by `PhoneNumber` value object.
- Duplicates allowed (relaxed in migration 0005).

## Patient ID
- Format: `MED-XXXXX` (5-digit zero-padded auto-increment).
- Auto-generated on patient registration.

## Notifications
- **WhatsApp is mandatory** (not optional). Uses `WHATSAPP_API_URL / WHATSAPP_API_TOKEN / WHATSAPP_FROM_NUMBER` env vars.
- SMS removed from scope entirely.
- Email available but secondary.

## Drug database
- Must include both BD generic names and brand names.
- `Medicine` has `generic_name`, `brand_name`, `manufacturer` fields.

## Localization
- UI supports English + Bangla (i18next).
- Backend messages can be in English (standard).

## Backup
- Server-level PostgreSQL only — no S3/Google Drive/cloud backup planned.

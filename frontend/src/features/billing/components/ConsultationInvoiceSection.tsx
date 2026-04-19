import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import Toast, { useToast } from "@/shared/components/Toast";
import {
  billingApi,
  INVOICE_STATUS_COLORS,
  type InvoiceSummary,
  type CreateInvoicePayload,
} from "@/features/billing/api/billingApi";
import type { Consultation } from "@/features/consultations/api/consultationsApi";
import { doctorProfilesApi } from "@/features/doctors/api/doctorsApi";

// ── Styles ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  fontSize: font.base,
  color: colors.text,
  background: colors.white,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: font.sm,
  fontWeight: 600,
  color: colors.textMuted,
  marginBottom: 4,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};

// ── Roles allowed to create invoices ─────────────────────────────────────────

const BILLING_ROLES = new Set(["receptionist", "assistant", "admin", "super_admin"]);

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color =
    INVOICE_STATUS_COLORS[status as keyof typeof INVOICE_STATUS_COLORS] ?? colors.textMuted;
  return (
    <span style={{
      background: `${color}18`, color, border: `1px solid ${color}44`,
      padding: "2px 10px", borderRadius: 999, fontSize: "12px", fontWeight: 600,
    }}>
      {status.replace("_", " ").toUpperCase()}
    </span>
  );
}

// ── Generate Invoice Modal ─────────────────────────────────────────────────────

interface LineItem {
  description: string;
  quantity: number;
  unit_price: string;
}

function GenerateInvoiceModal({
  consultation,
  defaultFee,
  onClose,
  onCreated,
}: {
  consultation: Consultation;
  defaultFee: number | null;
  onClose: () => void;
  onCreated: (inv: InvoiceSummary) => void;
}) {
  const { toast, show: showToast, dismiss } = useToast();
  const [items, setItems] = useState<LineItem[]>([
    {
      description: "Consultation Fee",
      quantity: 1,
      unit_price: defaultFee != null ? defaultFee.toFixed(2) : "",
    },
  ]);
  const [discount, setDiscount] = useState("0");
  const [error, setError] = useState("");

  // If the doctor profile query resolves after the modal opened, apply the fee
  // to the first item only if the user hasn't already entered a value.
  useEffect(() => {
    if (defaultFee != null) {
      setItems((prev) =>
        prev.map((item, i) =>
          i === 0 && item.unit_price === ""
            ? { ...item, unit_price: defaultFee.toFixed(2) }
            : item
        )
      );
    }
  }, [defaultFee]);

  const subtotal = items.reduce(
    (sum, i) => sum + (parseFloat(i.unit_price) || 0) * i.quantity,
    0
  );
  const discountAmt = subtotal * ((parseFloat(discount) || 0) / 100);
  const total = subtotal - discountAmt;

  const create = useMutation({
    mutationFn: () => {
      const payload: CreateInvoicePayload = {
        patient_id: consultation.patient_id,
        consultation_id: consultation.id,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: parseFloat(i.unit_price),
        })),
        discount_percent: parseFloat(discount) || 0,
      };
      return billingApi.createInvoice(payload);
    },
    onSuccess: async (result) => {
      const inv = await billingApi.getByConsultation(consultation.id);
      showToast(`Invoice ${result.invoice_number} created`, "success");
      if (inv) onCreated(inv);
      else onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error ?? "Failed to create invoice");
    },
  });

  const updateItem = (idx: number, key: keyof LineItem, val: string | number) =>
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [key]: val } : item))
    );

  const canSubmit =
    items.length > 0 &&
    items.every((i) => i.description.trim() && i.unit_price && parseFloat(i.unit_price) > 0);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100,
    }}>
      <div style={{
        background: colors.white, borderRadius: radius.lg, padding: 28,
        width: "min(580px, 96vw)", maxHeight: "90vh", overflowY: "auto",
        boxShadow: shadow.lg,
      }}>
        <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

        <h3 style={{ margin: "0 0 4px", fontSize: font.lg, fontWeight: 700 }}>
          Generate Invoice
        </h3>
        <p style={{ margin: "0 0 20px", color: colors.textMuted, fontSize: font.sm }}>
          Linked to this consultation · Patient ID: {consultation.patient_id}
        </p>

        {error && (
          <div style={{
            background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca",
            borderRadius: radius.md, padding: "10px 14px", marginBottom: 14, fontSize: font.sm,
          }}>
            {error}
          </div>
        )}

        {/* Line items */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={labelStyle}>Items</label>
            <button
              onClick={() => setItems((p) => [...p, { description: "", quantity: 1, unit_price: "" }])}
              style={{ fontSize: font.sm, color: colors.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              + Add Item
            </button>
          </div>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 110px 28px", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: "11px", color: colors.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Description</span>
            <span style={{ fontSize: "11px", color: colors.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Qty</span>
            <span style={{ fontSize: "11px", color: colors.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Unit Price ৳</span>
            <span />
          </div>

          {items.map((item, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 110px 28px", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <input
                placeholder="e.g. Consultation Fee"
                value={item.description}
                onChange={(e) => updateItem(i, "description", e.target.value)}
                style={inputStyle}
              />
              <input
                type="number" min={1}
                value={item.quantity}
                onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                style={inputStyle}
              />
              <input
                type="number" min="0.01" step="0.01" placeholder="0.00"
                value={item.unit_price}
                onChange={(e) => updateItem(i, "unit_price", e.target.value)}
                style={inputStyle}
              />
              {items.length > 1 && (
                <button
                  onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                  style={{ color: colors.danger, background: "none", border: "none", cursor: "pointer", fontSize: "18px", fontWeight: 700, lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {/* Fee hint — shown when doctor has a set consultation fee */}
          {defaultFee != null && (
            <p style={{ margin: "4px 0 0", fontSize: font.sm, color: colors.textMuted }}>
              Doctor's default consultation fee: <strong style={{ color: colors.text }}>৳{defaultFee.toFixed(2)}</strong>
            </p>
          )}
        </div>

        {/* Discount */}
        <div style={{ marginBottom: 16, maxWidth: 160 }}>
          <label style={labelStyle}>Discount %</label>
          <input
            type="number" min="0" max="100" value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Totals preview */}
        <div style={{
          background: colors.bg, borderRadius: radius.md, padding: "12px 16px",
          marginBottom: 20, fontSize: font.base,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: colors.textMuted, marginBottom: 4 }}>
            <span>Subtotal</span>
            <span>৳{subtotal.toFixed(2)}</span>
          </div>
          {discountAmt > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", color: colors.warning, marginBottom: 4 }}>
              <span>Discount ({discount}%)</span>
              <span>−৳{discountAmt.toFixed(2)}</span>
            </div>
          )}
          <div style={{
            display: "flex", justifyContent: "space-between", fontWeight: 700,
            color: colors.text, borderTop: `1px solid ${colors.border}`, paddingTop: 8, marginTop: 4,
          }}>
            <span>Total</span>
            <span>৳{total.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "8px 18px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}
          >
            Cancel
          </button>
          <button
            onClick={() => { setError(""); create.mutate(); }}
            disabled={create.isPending || !canSubmit}
            style={{
              padding: "8px 20px", background: colors.primary, color: colors.white,
              border: "none", borderRadius: radius.md, fontWeight: 600,
              cursor: canSubmit ? "pointer" : "not-allowed", fontSize: font.base,
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            {create.isPending ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Existing invoice summary card ─────────────────────────────────────────────

function ExistingInvoiceCard({ invoice }: { invoice: InvoiceSummary }) {
  const navigate = useNavigate();

  return (
    <div style={{
      background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: radius.md, padding: "14px 18px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div>
          <div style={{ fontWeight: 700, color: colors.text, fontSize: font.base }}>
            {invoice.invoice_number}
          </div>
          <div style={{ fontSize: font.sm, color: colors.textMuted, marginTop: 2 }}>
            {invoice.item_count} item{invoice.item_count !== 1 ? "s" : ""}
            {" · "}Total: <strong style={{ color: colors.text }}>৳{parseFloat(invoice.total_due).toFixed(2)}</strong>
            {invoice.created_at && (
              <span> · {new Date(invoice.created_at).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}</span>
            )}
          </div>
        </div>
        <StatusBadge status={invoice.status} />
      </div>
      <button
        onClick={() => navigate("/billing")}
        style={{
          padding: "6px 16px", background: colors.primaryLight,
          color: colors.primary, border: `1px solid #bfdbfe`,
          borderRadius: radius.md, cursor: "pointer", fontSize: font.sm, fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        View in Billing →
      </button>
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

interface Props {
  consultation: Consultation;
  userRole: string;
}

export default function ConsultationInvoiceSection({ consultation, userRole }: Props) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const canCreateInvoice = BILLING_ROLES.has(userRole);

  // Fetch existing invoice for this consultation
  const { data: invoice, isLoading } = useQuery<InvoiceSummary | null>({
    queryKey: ["consultation-invoice", consultation.id],
    queryFn: () => billingApi.getByConsultation(consultation.id),
    staleTime: 30_000,
  });

  // Fetch the attending physician's profile to get their default consultation fee.
  // Uses appointment_doctor_id (the doctor the patient booked with), which may differ
  // from doctor_id when an assistant doctor started the consultation.
  const attendingDoctorId = consultation.appointment_doctor_id ?? consultation.doctor_id;
  const { data: doctorProfile } = useQuery({
    queryKey: ["doctor-profile-by-user", attendingDoctorId],
    queryFn: () => doctorProfilesApi.getByUserId(attendingDoctorId),
    enabled: canCreateInvoice && !!attendingDoctorId,
    staleTime: 5 * 60_000, // 5 min — fee rarely changes mid-day
  });

  const defaultFee = doctorProfile?.consultation_fee ?? null;

  const handleCreated = (inv: InvoiceSummary) => {
    qc.setQueryData(["consultation-invoice", consultation.id], inv);
    setShowModal(false);
  };

  return (
    <>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: font.md, fontWeight: 700, color: colors.text }}>
          Invoice
        </h2>
        {canCreateInvoice && !invoice && !isLoading && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "6px 16px", background: colors.primary, color: colors.white,
              border: "none", borderRadius: radius.md, cursor: "pointer",
              fontSize: font.sm, fontWeight: 600,
            }}
          >
            + Generate Invoice
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading && (
        <p style={{ color: colors.textMuted, fontSize: font.sm, margin: 0 }}>
          Checking invoice…
        </p>
      )}

      {!isLoading && invoice && <ExistingInvoiceCard invoice={invoice} />}

      {!isLoading && !invoice && (
        <div style={{
          textAlign: "center", padding: "20px 0",
          color: colors.textMuted, fontSize: font.sm,
        }}>
          {canCreateInvoice
            ? "No invoice has been generated for this consultation yet."
            : "No invoice has been created for this consultation."}
        </div>
      )}

      {/* Generate Invoice Modal */}
      {showModal && (
        <GenerateInvoiceModal
          consultation={consultation}
          defaultFee={defaultFee}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}

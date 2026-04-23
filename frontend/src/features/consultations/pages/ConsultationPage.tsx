import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import Toast, { useToast } from "@/shared/components/Toast";
import { useAuthStore } from "@/features/auth/store/authStore";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import {
  consultationsApi,
  type Consultation,
  type VitalsPayload,
  type UpdateConsultationPayload,
  type StartConsultationPayload,
} from "@/features/consultations/api/consultationsApi";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import {
  prescriptionsApi,
  type PrescriptionItemPayload,
  type PrescriptionDetail,
} from "@/features/prescriptions/api/prescriptionsApi";
import type { MedicineSearchResult } from "@/features/medicines/api/medicinesApi";
import MedicineSearchInputShared from "@/features/prescriptions/components/MedicineSearchInput";
import PrescriptionEditForm from "@/features/prescriptions/components/PrescriptionEditForm";
import ConsultationInvoiceSection from "@/features/billing/components/ConsultationInvoiceSection";
import LabTestsSection from "@/features/testOrders/components/LabTestsSection";

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  fontSize: font.base,
  color: colors.text,
  background: colors.white,
  boxSizing: "border-box",
  outline: "none",
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

const cardStyle: React.CSSProperties = {
  background: colors.white,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  padding: 24,
  boxShadow: shadow.sm,
  marginBottom: 20,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: font.base, color: colors.text, whiteSpace: "pre-wrap" }}>{value}</div>
    </div>
  );
}

function VitalsPill({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      padding: "6px 14px",
      fontSize: font.sm,
      display: "inline-flex",
      flexDirection: "column",
      gap: 2,
    }}>
      <span style={{ color: colors.textMuted, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontWeight: 700, color: colors.text }}>{value}</span>
    </div>
  );
}

// ── Vitals form ───────────────────────────────────────────────────────────────

function VitalsForm({ consultationId, initial, onSaved }: {
  consultationId: string;
  initial: Consultation["vitals"];
  onSaved: () => void;
}) {
  const { toast, show: showToast, dismiss } = useToast();
  const [form, setForm] = useState<VitalsPayload>({
    bp_systolic: initial?.bp_systolic ?? null,
    bp_diastolic: initial?.bp_diastolic ?? null,
    pulse: initial?.pulse ?? null,
    temperature: initial?.temperature ? Number(initial.temperature) : null,
    weight: initial?.weight ? Number(initial.weight) : null,
    height: initial?.height ? Number(initial.height) : null,
    spo2: initial?.spo2 ?? null,
  });

  const mutation = useMutation({
    mutationFn: (payload: VitalsPayload) =>
      consultationsApi.updateVitals(consultationId, payload),
    onSuccess: () => { showToast("Vitals saved", "success"); onSaved(); },
    onError: () => showToast("Failed to save vitals", "error"),
  });

  const num = (v: string) => (v === "" ? null : Number(v));
  const field = (key: keyof VitalsPayload) => ({
    value: form[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: num(e.target.value) })),
  });

  return (
    <>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        <div><label style={labelStyle}>BP Systolic</label><input type="number" placeholder="mmHg" style={inputStyle} {...field("bp_systolic")} /></div>
        <div><label style={labelStyle}>BP Diastolic</label><input type="number" placeholder="mmHg" style={inputStyle} {...field("bp_diastolic")} /></div>
        <div><label style={labelStyle}>Pulse</label><input type="number" placeholder="bpm" style={inputStyle} {...field("pulse")} /></div>
        <div><label style={labelStyle}>Temp (°C)</label><input type="number" step="0.1" placeholder="°C" style={inputStyle} {...field("temperature")} /></div>
        <div><label style={labelStyle}>Weight (kg)</label><input type="number" step="0.1" placeholder="kg" style={inputStyle} {...field("weight")} /></div>
        <div><label style={labelStyle}>Height (cm)</label><input type="number" step="0.1" placeholder="cm" style={inputStyle} {...field("height")} /></div>
        <div><label style={labelStyle}>SpO₂ (%)</label><input type="number" placeholder="%" style={inputStyle} {...field("spo2")} /></div>
      </div>
      <div style={{ marginTop: 14, textAlign: "right" }}>
        <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}
          style={{ padding: "8px 22px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600 }}>
          {mutation.isPending ? "Saving…" : "Save Vitals"}
        </button>
      </div>
    </>
  );
}

// ── Notes form ────────────────────────────────────────────────────────────────

function NotesForm({ consultationId, initial, onSaved }: {
  consultationId: string;
  initial: Consultation;
  onSaved: () => void;
}) {
  const { toast, show: showToast, dismiss } = useToast();
  const [form, setForm] = useState<UpdateConsultationPayload>({
    chief_complaints: initial.chief_complaints,
    clinical_findings: initial.clinical_findings,
    diagnosis: initial.diagnosis,
    notes: initial.notes,
  });

  const mutation = useMutation({
    mutationFn: (payload: UpdateConsultationPayload) =>
      consultationsApi.update(consultationId, payload),
    onSuccess: () => { showToast("Notes saved", "success"); onSaved(); },
    onError: () => showToast("Failed to save notes", "error"),
  });

  const ta = (key: keyof UpdateConsultationPayload) => ({
    value: form[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
    rows: 3,
    style: { ...inputStyle, resize: "vertical" as const, fontFamily: font.family },
  });

  return (
    <>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />
      <div style={{ display: "grid", gap: 14 }}>
        <div><label style={labelStyle}>Chief Complaints *</label><textarea {...ta("chief_complaints")} /></div>
        <div><label style={labelStyle}>Clinical Findings</label><textarea {...ta("clinical_findings")} /></div>
        <div><label style={labelStyle}>Diagnosis</label><textarea {...ta("diagnosis")} rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: font.family }} /></div>
        <div><label style={labelStyle}>Notes / Instructions</label><textarea {...ta("notes")} /></div>
      </div>
      <div style={{ marginTop: 14, textAlign: "right" }}>
        <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}
          style={{ padding: "8px 22px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600 }}>
          {mutation.isPending ? "Saving…" : "Save Notes"}
        </button>
      </div>
    </>
  );
}

// ── Prescription read-only display ────────────────────────────────────────────

function PrescriptionView({ rx, userRole, onApproved, onEdited }: {
  rx: PrescriptionDetail;
  userRole?: string;
  onApproved?: () => void;
  onEdited?: () => void;
}) {
  const { toast, show: showToast, dismiss } = useToast();
  const [editMode, setEditMode] = useState(false);

  const approveMutation = useMutation({
    mutationFn: () => prescriptionsApi.approve(rx.prescription_id),
    onSuccess: () => {
      showToast("Prescription approved", "success");
      onApproved?.();
    },
    onError: () => showToast("Failed to approve prescription", "error"),
  });

  // Doctor editing a draft — render the edit form instead of the read-only view
  if (editMode && rx.status === "draft" && userRole === "doctor") {
    return (
      <PrescriptionEditForm
        rx={rx}
        onSaved={() => { setEditMode(false); onEdited?.(); }}
        onSavedAndApproved={() => { setEditMode(false); onApproved?.(); }}
        onCancel={() => setEditMode(false)}
      />
    );
  }

  const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
    active:   { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
    approved: { bg: "#eff6ff", color: colors.primary, border: "#bfdbfe" },
    draft:    { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  };
  const ss = STATUS_STYLES[rx.status] ?? STATUS_STYLES.active;

  return (
    <div>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

      {/* Doctor's action banner for draft prescriptions */}
      {rx.status === "draft" && userRole === "doctor" && (
        <div style={{
          background: "#fef3c7", border: "1px solid #fde68a", borderRadius: radius.md,
          padding: "12px 16px", marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontWeight: 600, color: "#92400e", fontSize: font.base }}>
              Pending your approval
            </div>
            <div style={{ fontSize: font.sm, color: "#b45309", marginTop: 2 }}>
              Drafted by an assistant doctor. You can edit medicines before approving.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setEditMode(true)}
              style={{
                padding: "7px 16px", background: colors.white,
                border: `1px solid #f59e0b`, color: "#92400e",
                borderRadius: radius.md, cursor: "pointer",
                fontSize: font.sm, fontWeight: 600,
              }}
            >
              ✏ Edit
            </button>
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              style={{
                padding: "7px 18px", background: colors.success, color: colors.white,
                border: "none", borderRadius: radius.md, cursor: "pointer",
                fontSize: font.sm, fontWeight: 600,
                opacity: approveMutation.isPending ? 0.7 : 1,
              }}
            >
              {approveMutation.isPending ? "Approving…" : "Approve"}
            </button>
          </div>
        </div>
      )}

      {rx.status === "draft" && userRole !== "doctor" && (
        <div style={{
          background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: radius.md,
          padding: "12px 16px", marginBottom: 16,
        }}>
          <div style={{ fontWeight: 600, color: colors.primary, fontSize: font.base }}>
            Awaiting doctor approval
          </div>
          <div style={{ fontSize: font.sm, color: "#1d4ed8", marginTop: 2 }}>
            Your prescription has been submitted and is pending review by a doctor.
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{
          background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
          padding: "3px 12px", borderRadius: 999, fontSize: font.sm,
          fontWeight: 600, textTransform: "capitalize",
        }}>
          {rx.status === "draft" ? "Draft — Pending Approval" : rx.status === "approved" ? "Approved" : "Active"}
        </span>
        {rx.follow_up_date && (
          <span style={{ fontSize: font.sm, color: colors.primary }}>
            Follow-up: {rx.follow_up_date}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {rx.items.map((item, i) => (
          <div key={i} style={{
            background: colors.bg, border: `1px solid ${colors.border}`,
            borderRadius: radius.md, padding: "10px 14px",
          }}>
            <div style={{ fontWeight: 600, color: colors.text, fontSize: font.base }}>
              {item.medicine_name}
            </div>
            <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 3 }}>
              <span style={{ fontWeight: 500, color: colors.text }}>{item.dosage_display}</span>
              {" · "}{item.route}
              {item.instructions && <span> · {item.instructions}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Prescription create form ──────────────────────────────────────────────────

interface DraftItem extends PrescriptionItemPayload {
  _key: number; // local list key
}

const ROUTES = ["oral", "sublingual", "topical", "inhaled", "iv", "im", "sc", "rectal", "nasal", "ophthalmic"];

// MedicineSearchInput is imported from shared prescriptions components above

function PrescriptionCreateForm({ consultationId, patientId, onCreated }: {
  consultationId: string;
  patientId: string;
  onCreated: () => void;
}) {
  const { toast, show: showToast, dismiss } = useToast();
  const [items, setItems] = useState<DraftItem[]>([]);
  const [followUpDate, setFollowUpDate] = useState("");
  const [error, setError] = useState("");
  const [editingItem, setEditingItem] = useState<Partial<DraftItem> | null>(null);
  const keyRef = useRef(0);

  const createMutation = useMutation({
    mutationFn: () =>
      prescriptionsApi.create({
        consultation_id: consultationId,
        patient_id: patientId,
        items: items.map(({ _key, ...rest }) => rest),
        follow_up_date: followUpDate || undefined,
      }),
    onSuccess: () => {
      showToast("Prescription created", "success");
      onCreated();
    },
    onError: (e: any) =>
      setError(e.response?.data?.error ?? "Failed to create prescription"),
  });

  const handleSelectMedicine = (m: MedicineSearchResult) => {
    setEditingItem({
      _key: ++keyRef.current,
      medicine_id: m.id,
      medicine_name: `${m.brand_name} ${m.strength}`,
      morning: "",
      afternoon: "",
      evening: "",
      duration_days: 7,
      route: "oral",
      instructions: "",
    });
  };

  const handleAddItem = () => {
    if (!editingItem) return;
    if (!editingItem.medicine_id) return setError("Select a medicine");
    if (!editingItem.morning && !editingItem.afternoon && !editingItem.evening)
      return setError("Enter at least one dosage (morning/afternoon/evening)");
    // Normalise empty slots to "0" so backend never receives blank strings
    const normalised: DraftItem = {
      ...editingItem as DraftItem,
      morning: editingItem.morning || "0",
      afternoon: editingItem.afternoon || "0",
      evening: editingItem.evening || "0",
    };
    setItems((prev) => [...prev, normalised]);
    setEditingItem(null);
    setError("");
  };

  return (
    <>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

      {error && (
        <div style={{ background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca", borderRadius: radius.md, padding: "8px 12px", marginBottom: 12, fontSize: font.sm }}>
          {error}
        </div>
      )}

      {/* Medicine search */}
      <div style={{ marginBottom: 16 }}>
        <MedicineSearchInputShared onSelect={handleSelectMedicine} />
      </div>

      {/* Item editor — shown after selecting a medicine */}
      {editingItem && (
        <div style={{ background: colors.primaryLight, border: `1px solid #bfdbfe`, borderRadius: radius.md, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: colors.text, marginBottom: 12, fontSize: font.base }}>
            {editingItem.medicine_name}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>Morning</label>
              <input type="text" placeholder="e.g. 1" style={inputStyle}
                value={editingItem.morning ?? ""}
                onChange={(e) => setEditingItem((f) => ({ ...f!, morning: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Afternoon</label>
              <input type="text" placeholder="e.g. 0" style={inputStyle}
                value={editingItem.afternoon ?? ""}
                onChange={(e) => setEditingItem((f) => ({ ...f!, afternoon: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Evening</label>
              <input type="text" placeholder="e.g. 1" style={inputStyle}
                value={editingItem.evening ?? ""}
                onChange={(e) => setEditingItem((f) => ({ ...f!, evening: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Duration (days)</label>
              <input type="number" min={1} style={inputStyle}
                value={editingItem.duration_days ?? 7}
                onChange={(e) => setEditingItem((f) => ({ ...f!, duration_days: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Route</label>
              <select style={{ ...inputStyle, background: colors.white }}
                value={editingItem.route ?? "oral"}
                onChange={(e) => setEditingItem((f) => ({ ...f!, route: e.target.value }))}>
                {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Instructions</label>
              <input type="text" placeholder="e.g. After meal, with water" style={inputStyle}
                value={editingItem.instructions ?? ""}
                onChange={(e) => setEditingItem((f) => ({ ...f!, instructions: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setEditingItem(null)}
              style={{ padding: "6px 16px", background: colors.white, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.sm }}>
              Cancel
            </button>
            <button onClick={handleAddItem}
              style={{ padding: "6px 16px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.sm, fontWeight: 600 }}>
              Add to Prescription
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Items ({items.length})
          </div>
          {items.map((item) => (
            <div key={item._key} style={{ display: "flex", alignItems: "center", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: "8px 12px", marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: colors.text, fontSize: font.base }}>{item.medicine_name}</div>
                <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
                  {item.morning || "0"}+{item.afternoon || "0"}+{item.evening || "0"} × {item.duration_days} days · {item.route}
                  {item.instructions && ` · ${item.instructions}`}
                </div>
              </div>
              <button
                onClick={() => setItems((prev) => prev.filter((i) => i._key !== item._key))}
                style={{ background: "none", border: "none", color: colors.danger, cursor: "pointer", fontSize: font.lg, lineHeight: 1, padding: "0 4px" }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Follow-up date + submit */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Follow-up Date (optional)</label>
          <input type="date" style={inputStyle} value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
        </div>
        <button
          onClick={() => {
            setError("");
            if (items.length === 0) return setError("Add at least one medicine");
            createMutation.mutate();
          }}
          disabled={createMutation.isPending || items.length === 0}
          style={{
            padding: "9px 22px", background: colors.primary, color: colors.white,
            border: "none", borderRadius: radius.md, cursor: items.length === 0 ? "not-allowed" : "pointer",
            fontSize: font.base, fontWeight: 600, opacity: items.length === 0 ? 0.5 : 1, flexShrink: 0,
          }}>
          {createMutation.isPending ? "Saving…" : "Save Prescription"}
        </button>
      </div>
    </>
  );
}

// ── Prescription section (wrapper) ────────────────────────────────────────────

function PrescriptionSection({ consultation, isCompleted, userRole }: {
  consultation: Consultation;
  isCompleted: boolean;
  userRole: string;
}) {
  const qc = useQueryClient();

  const { data: rx, isLoading, error } = useQuery<PrescriptionDetail | null>({
    queryKey: ["prescription-by-consultation", consultation.id],
    queryFn: () =>
      prescriptionsApi
        .getByConsultation(consultation.id)
        .catch((e) => (e?.response?.status === 404 ? null : Promise.reject(e))),
    staleTime: 0,
  });

  const handleCreated = () => {
    qc.invalidateQueries({ queryKey: ["prescription-by-consultation", consultation.id] });
  };

  const handleApproved = () => {
    qc.invalidateQueries({ queryKey: ["prescription-by-consultation", consultation.id] });
    qc.invalidateQueries({ queryKey: ["pending-prescriptions"] });
  };

  if (isLoading) return <div style={{ color: colors.textMuted, fontSize: font.sm }}>Loading prescription…</div>;
  if (error) return <div style={{ color: colors.danger, fontSize: font.sm }}>Failed to load prescription.</div>;

  if (rx) return (
    <PrescriptionView
      rx={rx}
      userRole={userRole}
      onApproved={handleApproved}
      onEdited={() => qc.invalidateQueries({ queryKey: ["prescription-by-consultation", consultation.id] })}
    />
  );

  if (isCompleted) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: colors.textMuted, fontSize: font.sm }}>
        No prescription was written for this consultation.
      </div>
    );
  }

  return (
    <PrescriptionCreateForm
      consultationId={consultation.id}
      patientId={consultation.patient_id}
      onCreated={handleCreated}
    />
  );
}

// ── Complete modal ────────────────────────────────────────────────────────────

function CompleteModal({ consultation, onClose, onCompleted }: {
  consultation: Consultation;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [diagnosis, setDiagnosis] = useState(consultation.diagnosis);
  const [clinicalFindings, setClinicalFindings] = useState(consultation.clinical_findings);
  const [notes, setNotes] = useState(consultation.notes);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      consultationsApi.complete(consultation.id, { diagnosis, clinical_findings: clinicalFindings, notes }),
    onSuccess: onCompleted,
    onError: (e: any) =>
      setError(e.response?.data?.error ?? "Failed to complete consultation"),
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.lg, width: "min(580px, 96vw)", maxHeight: "90vh", overflowY: "auto", padding: 28 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: font.xl, fontWeight: 700, color: colors.text }}>Complete Consultation</h2>
        <p style={{ margin: "0 0 20px", fontSize: font.sm, color: colors.textMuted }}>
          Review and finalise. <strong>Diagnosis is required.</strong> This action cannot be undone.
        </p>

        {error && (
          <div style={{ background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca", borderRadius: radius.md, padding: "10px 14px", marginBottom: 16, fontSize: font.sm }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Diagnosis *</label>
          <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: font.family }} placeholder="Required to complete consultation" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Clinical Findings</label>
          <textarea value={clinicalFindings} onChange={(e) => setClinicalFindings(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: font.family }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Notes / Instructions</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: font.family }} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ padding: "9px 20px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}>
            Cancel
          </button>
          <button
            onClick={() => { setError(""); if (!diagnosis.trim()) return setError("Diagnosis is required"); mutation.mutate(); }}
            disabled={mutation.isPending}
            style={{ padding: "9px 22px", background: colors.success, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600 }}>
            {mutation.isPending ? "Completing…" : "Complete Consultation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ConsultationPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast, show: showToast, dismiss } = useToast();
  const { user } = useAuthStore();
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const isClinical = ["doctor", "assistant_doctor"].includes(user?.role ?? "");

  const { data: consultation, isLoading, error, refetch } = useQuery<Consultation | null>({
    queryKey: ["consultation-by-appointment", appointmentId],
    queryFn: () => consultationsApi.getByAppointment(appointmentId!),
    enabled: !!appointmentId,
    staleTime: 0,
  });

  // Needed when consultation doesn't exist yet so clinical users can start one
  const { data: appointment } = useQuery({
    queryKey: ["appointment-detail", appointmentId],
    queryFn: () => appointmentsApi.get(appointmentId!),
    enabled: !!appointmentId,
    staleTime: 60_000,
  });

  const [chiefComplaints, setChiefComplaints] = useState("");
  const [startError, setStartError] = useState("");

  const startMutation = useMutation({
    mutationFn: (payload: StartConsultationPayload) => consultationsApi.start(payload),
    onSuccess: () => {
      setChiefComplaints("");
      setStartError("");
      qc.invalidateQueries({ queryKey: ["queue-live"] });
      refetch();
    },
    onError: (e: any) => setStartError(e.response?.data?.error ?? "Failed to start consultation"),
  });

  const handleStartConsultation = () => {
    if (!chiefComplaints.trim()) return setStartError("Chief complaints are required");
    if (!appointment) return;
    startMutation.mutate({
      appointment_id: appointmentId!,
      patient_id: appointment.patient_id,
      chief_complaints: chiefComplaints,
    });
  };

  const handleCompleted = () => {
    setShowCompleteModal(false);
    showToast("Consultation completed successfully", "success");
    qc.invalidateQueries({ queryKey: ["queue-live"] });
    qc.invalidateQueries({ queryKey: ["consultation-by-appointment", appointmentId] });
    refetch();
  };

  if (isLoading) {
    return <AppShell><div style={{ padding: 40, color: colors.textMuted }}>Loading consultation…</div></AppShell>;
  }
  if (error || consultation === undefined) {
    return <AppShell><div style={{ padding: 40, color: colors.danger }}>Failed to load consultation.</div></AppShell>;
  }
  if (!consultation) {
    // Clinical users can start the consultation inline rather than hitting a dead-end
    if (isClinical) {
      return (
        <AppShell>
          <div style={{ padding: "40px", maxWidth: 560 }}>
            <h2 style={{ margin: "0 0 4px", fontSize: font.lg, fontWeight: 700, color: colors.text }}>
              Start Consultation
            </h2>
            {appointment && (
              <p style={{ margin: "0 0 20px", fontSize: font.sm, color: colors.textMuted }}>
                Patient: <strong>{appointment.patient_name}</strong> · {appointment.patient_phone}
              </p>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Chief Complaints *
              </label>
              <textarea
                autoFocus
                value={chiefComplaints}
                onChange={(e) => setChiefComplaints(e.target.value)}
                rows={4}
                placeholder="Describe the patient's chief complaints…"
                style={{ ...inputStyle, resize: "vertical", fontFamily: font.family }}
              />
            </div>
            {startError && (
              <div style={{ background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca", borderRadius: radius.md, padding: "10px 14px", marginBottom: 14, fontSize: font.sm }}>
                {startError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => navigate("/queue")}
                style={{ padding: "9px 20px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}
              >
                ← Back to Queue
              </button>
              <button
                onClick={handleStartConsultation}
                disabled={startMutation.isPending}
                style={{ padding: "9px 22px", background: "#d97706", color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600, opacity: startMutation.isPending ? 0.7 : 1 }}
              >
                {startMutation.isPending ? "Starting…" : "Start Consultation"}
              </button>
            </div>
          </div>
        </AppShell>
      );
    }
    return (
      <AppShell>
        <div style={{ padding: 40, color: colors.textMuted }}>
          No consultation found for this appointment.{" "}
          <button onClick={() => navigate("/queue")} style={{ color: colors.primary, background: "none", border: "none", cursor: "pointer" }}>
            ← Back to Queue
          </button>
        </div>
      </AppShell>
    );
  }

  const isCompleted = !consultation.is_draft;
  const v = consultation.vitals;

  return (
    <AppShell>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

      {showCompleteModal && (
        <CompleteModal
          consultation={consultation}
          onClose={() => setShowCompleteModal(false)}
          onCompleted={handleCompleted}
        />
      )}

      <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <button onClick={() => navigate("/queue")}
            style={{ background: "none", border: "none", color: colors.primary, cursor: "pointer", fontSize: font.base, fontWeight: 500, flexShrink: 0 }}>
            ← Queue
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>Consultation</h1>
            <p style={{ margin: "2px 0 0", fontSize: font.sm, color: colors.textMuted }}>
              Started {consultation.created_at ? new Date(consultation.created_at).toLocaleString("en-BD") : "—"}
            </p>
          </div>
          <span style={{
            background: isCompleted ? "#f0fdf4" : "#fef3c7",
            color: isCompleted ? "#166534" : "#92400e",
            border: `1px solid ${isCompleted ? "#bbf7d0" : "#fde68a"}`,
            padding: "4px 14px", borderRadius: 999, fontSize: font.sm, fontWeight: 600,
          }}>
            {isCompleted ? "✓ Completed" : "In Progress"}
          </span>
          {!isCompleted && isClinical && (
            <button onClick={() => setShowCompleteModal(true)}
              style={{ padding: "9px 22px", background: colors.success, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600, flexShrink: 0 }}>
              Complete Consultation
            </button>
          )}
        </div>

        {/* ── Completed view ── */}
        {isCompleted ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Left: clinical summary */}
              <div style={cardStyle}>
                <h2 style={{ margin: "0 0 16px", fontSize: font.md, fontWeight: 700, color: colors.text }}>Consultation Summary</h2>
                <Field label="Chief Complaints" value={consultation.chief_complaints} />
                <Field label="Clinical Findings" value={consultation.clinical_findings} />
                <Field label="Diagnosis" value={consultation.diagnosis} />
                <Field label="Notes" value={consultation.notes} />
                {consultation.completed_at && (
                  <div style={{ fontSize: font.sm, color: colors.textMuted, marginTop: 8 }}>
                    Completed: {new Date(consultation.completed_at).toLocaleString("en-BD")}
                  </div>
                )}
              </div>

              {/* Right: vitals + prescription (prescription visible to clinical staff only) */}
              <div>
                {v && (
                  <div style={cardStyle}>
                    <h2 style={{ margin: "0 0 12px", fontSize: font.md, fontWeight: 700, color: colors.text }}>Vitals</h2>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {v.bp_display && <VitalsPill label="Blood Pressure" value={v.bp_display} />}
                      {v.pulse && <VitalsPill label="Pulse" value={`${v.pulse} bpm`} />}
                      {v.temperature && <VitalsPill label="Temperature" value={`${v.temperature} °C`} />}
                      {v.spo2 && <VitalsPill label="SpO₂" value={`${v.spo2}%`} />}
                      {v.weight && <VitalsPill label="Weight" value={`${v.weight} kg`} />}
                      {v.height && <VitalsPill label="Height" value={`${v.height} cm`} />}
                      {v.bmi && <VitalsPill label="BMI" value={v.bmi} />}
                    </div>
                  </div>
                )}
                {isClinical && (
                  <div style={cardStyle}>
                    <h2 style={{ margin: "0 0 16px", fontSize: font.md, fontWeight: 700, color: colors.text }}>Prescription</h2>
                    <PrescriptionSection consultation={consultation} isCompleted={isCompleted} userRole={user?.role ?? ""} />
                  </div>
                )}
              </div>
            </div>

            {/* Lab Tests — full width below the grid */}
            <div style={cardStyle}>
              <LabTestsSection consultationId={consultation.id} userRole={user?.role ?? ""} />
            </div>

            {/* Invoice — full width below the grid */}
            <div style={cardStyle}>
              <ConsultationInvoiceSection
                consultation={consultation}
                userRole={user?.role ?? ""}
              />
            </div>
          </>
        ) : (
          /* ── Draft / in-progress view ── */
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Clinical Notes */}
              <div style={cardStyle}>
                <h2 style={{ margin: "0 0 16px", fontSize: font.md, fontWeight: 700, color: colors.text }}>Clinical Notes</h2>
                {isClinical ? (
                  <NotesForm consultationId={consultation.id} initial={consultation} onSaved={() => refetch()} />
                ) : (
                  <div>
                    <Field label="Chief Complaints" value={consultation.chief_complaints} />
                    <Field label="Clinical Findings" value={consultation.clinical_findings} />
                    <Field label="Diagnosis" value={consultation.diagnosis} />
                    <Field label="Notes / Instructions" value={consultation.notes} />
                    {!consultation.chief_complaints && !consultation.diagnosis && (
                      <p style={{ margin: 0, color: colors.textMuted, fontSize: font.sm }}>
                        No clinical notes recorded yet.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Vitals */}
              <div style={cardStyle}>
                <h2 style={{ margin: "0 0 16px", fontSize: font.md, fontWeight: 700, color: colors.text }}>Vitals</h2>
                {v && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    {v.bp_display && <VitalsPill label="BP" value={v.bp_display} />}
                    {v.pulse && <VitalsPill label="Pulse" value={`${v.pulse} bpm`} />}
                    {v.temperature && <VitalsPill label="Temp" value={`${v.temperature}°C`} />}
                    {v.spo2 && <VitalsPill label="SpO₂" value={`${v.spo2}%`} />}
                    {v.weight && <VitalsPill label="Weight" value={`${v.weight} kg`} />}
                    {v.height && <VitalsPill label="Height" value={`${v.height} cm`} />}
                    {v.bmi && <VitalsPill label="BMI" value={v.bmi} />}
                  </div>
                )}
                {isClinical ? (
                  <VitalsForm consultationId={consultation.id} initial={consultation.vitals} onSaved={() => refetch()} />
                ) : (
                  !v && (
                    <p style={{ margin: 0, color: colors.textMuted, fontSize: font.sm }}>
                      No vitals recorded yet.
                    </p>
                  )
                )}
              </div>
            </div>

            {/* Prescription — clinical staff only (prescription API is clinical-only) */}
            {isClinical && (
              <div style={cardStyle}>
                <h2 style={{ margin: "0 0 16px", fontSize: font.md, fontWeight: 700, color: colors.text }}>Prescription</h2>
                <PrescriptionSection consultation={consultation} isCompleted={false} userRole={user?.role ?? ""} />
              </div>
            )}

            {/* Lab Tests — visible to all; add/approve controls hidden for non-clinical via userRole */}
            <div style={cardStyle}>
              <LabTestsSection consultationId={consultation.id} userRole={user?.role ?? ""} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import Toast, { useToast } from "@/shared/components/Toast";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import {
  consultationsApi,
  type Consultation,
  type VitalsPayload,
  type UpdateConsultationPayload,
} from "@/features/consultations/api/consultationsApi";

// ── helpers ───────────────────────────────────────────────────────────────────

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

function VitalsForm({
  consultationId,
  initial,
  onSaved,
}: {
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
    onSuccess: () => {
      showToast("Vitals saved", "success");
      onSaved();
    },
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
        {/* BP row */}
        <div>
          <label style={labelStyle}>BP Systolic</label>
          <input type="number" placeholder="mmHg" style={inputStyle} {...field("bp_systolic")} />
        </div>
        <div>
          <label style={labelStyle}>BP Diastolic</label>
          <input type="number" placeholder="mmHg" style={inputStyle} {...field("bp_diastolic")} />
        </div>
        <div>
          <label style={labelStyle}>Pulse</label>
          <input type="number" placeholder="bpm" style={inputStyle} {...field("pulse")} />
        </div>
        <div>
          <label style={labelStyle}>Temp (°C)</label>
          <input type="number" step="0.1" placeholder="°C" style={inputStyle} {...field("temperature")} />
        </div>
        <div>
          <label style={labelStyle}>Weight (kg)</label>
          <input type="number" step="0.1" placeholder="kg" style={inputStyle} {...field("weight")} />
        </div>
        <div>
          <label style={labelStyle}>Height (cm)</label>
          <input type="number" step="0.1" placeholder="cm" style={inputStyle} {...field("height")} />
        </div>
        <div>
          <label style={labelStyle}>SpO₂ (%)</label>
          <input type="number" placeholder="%" style={inputStyle} {...field("spo2")} />
        </div>
      </div>
      <div style={{ marginTop: 14, textAlign: "right" }}>
        <button
          onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending}
          style={{
            padding: "8px 22px",
            background: colors.primary,
            color: colors.white,
            border: "none",
            borderRadius: radius.md,
            cursor: "pointer",
            fontSize: font.base,
            fontWeight: 600,
          }}
        >
          {mutation.isPending ? "Saving…" : "Save Vitals"}
        </button>
      </div>
    </>
  );
}

// ── Notes form ────────────────────────────────────────────────────────────────

function NotesForm({
  consultationId,
  initial,
  onSaved,
}: {
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
    onSuccess: () => {
      showToast("Notes saved", "success");
      onSaved();
    },
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
        <div>
          <label style={labelStyle}>Chief Complaints *</label>
          <textarea {...ta("chief_complaints")} />
        </div>
        <div>
          <label style={labelStyle}>Clinical Findings</label>
          <textarea {...ta("clinical_findings")} />
        </div>
        <div>
          <label style={labelStyle}>Diagnosis</label>
          <textarea {...ta("diagnosis")} rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: font.family, borderColor: form.diagnosis ? colors.border : colors.border }} />
        </div>
        <div>
          <label style={labelStyle}>Notes / Instructions</label>
          <textarea {...ta("notes")} />
        </div>
      </div>
      <div style={{ marginTop: 14, textAlign: "right" }}>
        <button
          onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending}
          style={{
            padding: "8px 22px",
            background: colors.primary,
            color: colors.white,
            border: "none",
            borderRadius: radius.md,
            cursor: "pointer",
            fontSize: font.base,
            fontWeight: 600,
          }}
        >
          {mutation.isPending ? "Saving…" : "Save Notes"}
        </button>
      </div>
    </>
  );
}

// ── Complete modal ────────────────────────────────────────────────────────────

function CompleteModal({
  consultation,
  onClose,
  onCompleted,
}: {
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
      consultationsApi.complete(consultation.id, {
        diagnosis,
        clinical_findings: clinicalFindings,
        notes,
      }),
    onSuccess: onCompleted,
    onError: (e: any) =>
      setError(e.response?.data?.error ?? "Failed to complete consultation"),
  });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: colors.white, borderRadius: radius.lg, boxShadow: shadow.lg,
        width: "min(580px, 96vw)", maxHeight: "90vh", overflowY: "auto", padding: 28,
      }}>
        <h2 style={{ margin: "0 0 6px", fontSize: font.xl, fontWeight: 700, color: colors.text }}>
          Complete Consultation
        </h2>
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
          <textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: font.family }}
            placeholder="Required to complete consultation"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Clinical Findings</label>
          <textarea
            value={clinicalFindings}
            onChange={(e) => setClinicalFindings(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: font.family }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Notes / Instructions</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: font.family }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "9px 20px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setError("");
              if (!diagnosis.trim()) return setError("Diagnosis is required");
              mutation.mutate();
            }}
            disabled={mutation.isPending}
            style={{ padding: "9px 22px", background: colors.success, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600 }}
          >
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
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const {
    data: consultation,
    isLoading,
    error,
    refetch,
  } = useQuery<Consultation | null>({
    queryKey: ["consultation-by-appointment", appointmentId],
    queryFn: () => consultationsApi.getByAppointment(appointmentId!),
    enabled: !!appointmentId,
    staleTime: 0,
  });

  const handleSaved = () => {
    refetch();
  };

  const handleCompleted = () => {
    setShowCompleteModal(false);
    showToast("Consultation completed successfully", "success");
    qc.invalidateQueries({ queryKey: ["queue-live"] });
    qc.invalidateQueries({ queryKey: ["consultation-by-appointment", appointmentId] });
    refetch();
  };

  if (isLoading) {
    return (
      <AppShell>
        <div style={{ padding: 40, color: colors.textMuted }}>Loading consultation…</div>
      </AppShell>
    );
  }

  if (error || consultation === undefined) {
    return (
      <AppShell>
        <div style={{ padding: 40, color: colors.danger }}>Failed to load consultation.</div>
      </AppShell>
    );
  }

  if (!consultation) {
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

      <div style={{ padding: "32px 40px", maxWidth: 1100, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <button
            onClick={() => navigate("/queue")}
            style={{ background: "none", border: "none", color: colors.primary, cursor: "pointer", fontSize: font.base, fontWeight: 500, flexShrink: 0 }}
          >
            ← Queue
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>
              Consultation
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: font.sm, color: colors.textMuted }}>
              Started {consultation.created_at ? new Date(consultation.created_at).toLocaleString("en-BD") : "—"}
            </p>
          </div>
          {/* Status badge */}
          <span style={{
            background: isCompleted ? "#f0fdf4" : "#fef3c7",
            color: isCompleted ? "#166534" : "#92400e",
            border: `1px solid ${isCompleted ? "#bbf7d0" : "#fde68a"}`,
            padding: "4px 14px",
            borderRadius: 999,
            fontSize: font.sm,
            fontWeight: 600,
          }}>
            {isCompleted ? "✓ Completed" : "In Progress"}
          </span>
          {/* Complete button */}
          {!isCompleted && (
            <button
              onClick={() => setShowCompleteModal(true)}
              style={{
                padding: "9px 22px",
                background: colors.success,
                color: colors.white,
                border: "none",
                borderRadius: radius.md,
                cursor: "pointer",
                fontSize: font.base,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              Complete Consultation
            </button>
          )}
        </div>

        {/* ── Completed view ── */}
        {isCompleted ? (
          <>
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 16px", fontSize: font.md, fontWeight: 700, color: colors.text }}>
                Consultation Summary
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div>
                  <Field label="Chief Complaints" value={consultation.chief_complaints} />
                  <Field label="Clinical Findings" value={consultation.clinical_findings} />
                  <Field label="Diagnosis" value={consultation.diagnosis} />
                  <Field label="Notes" value={consultation.notes} />
                </div>
                <div>
                  {v && (
                    <>
                      <div style={labelStyle}>Vitals</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                        {v.bp_display && <VitalsPill label="Blood Pressure" value={v.bp_display} />}
                        {v.pulse && <VitalsPill label="Pulse" value={`${v.pulse} bpm`} />}
                        {v.temperature && <VitalsPill label="Temperature" value={`${v.temperature} °C`} />}
                        {v.spo2 && <VitalsPill label="SpO₂" value={`${v.spo2}%`} />}
                        {v.weight && <VitalsPill label="Weight" value={`${v.weight} kg`} />}
                        {v.height && <VitalsPill label="Height" value={`${v.height} cm`} />}
                        {v.bmi && <VitalsPill label="BMI" value={v.bmi} />}
                      </div>
                    </>
                  )}
                  {consultation.completed_at && (
                    <div style={{ fontSize: font.sm, color: colors.textMuted, marginTop: 8 }}>
                      Completed at: {new Date(consultation.completed_at).toLocaleString("en-BD")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ── Draft / in-progress view ── */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Left: Clinical Notes */}
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 16px", fontSize: font.md, fontWeight: 700, color: colors.text }}>
                Clinical Notes
              </h2>
              <NotesForm
                consultationId={consultation.id}
                initial={consultation}
                onSaved={handleSaved}
              />
            </div>

            {/* Right: Vitals */}
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 16px", fontSize: font.md, fontWeight: 700, color: colors.text }}>
                Vitals
              </h2>
              {/* Current vitals display */}
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
              <VitalsForm
                consultationId={consultation.id}
                initial={consultation.vitals}
                onSaved={handleSaved}
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

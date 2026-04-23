import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import apiClient from "@/shared/lib/apiClient";
import type { Patient } from "@/features/patients/api/patientsApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { reportsApi, type ReportCategory } from "@/features/reports/api/reportsApi";
import { testOrdersApi, type TestOrder } from "@/features/testOrders/api/testOrdersApi";

interface Vitals {
  bp: string | null;
  pulse: number | null;
  temperature: string | null;
  weight: string | null;
  height: string | null;
  spo2: number | null;
  bmi: string | null;
}

interface PrescriptionItem {
  medicine_name: string;
  dosage: string;
  duration_days: number;
  route: string;
  instructions: string;
}

interface Consultation {
  id: string;
  appointment_id: string;
  chief_complaints: string;
  clinical_findings: string;
  diagnosis: string;
  notes: string;
  vitals: Vitals | null;
  is_draft: boolean;
  created_at: string | null;
  completed_at: string | null;
  prescription: {
    prescription_id: string;
    status: string;
    follow_up_date: string | null;
    items: PrescriptionItem[];
  } | null;
}

interface AppointmentEntry {
  id: string;
  scheduled_at: string;
  appointment_type: string;
  status: string;
  token_number: number | null;
  notes: string;
}

interface Report {
  id: string;
  category: string;
  file_url: string;
  original_filename: string;
  uploaded_by_name: string;
  uploaded_at: string;
  notes: string;
}

interface PrescriptionEvent {
  prescription_id: string;
  status: string;
  follow_up_date: string | null;
  items: PrescriptionItem[];
  consultation_id: string;
}

interface PatientNote {
  id: string;
  content: string;
  created_by_name: string;
  created_by_role: string;
  created_at: string;
}

interface PatientHistory {
  patient: Patient;
  past_diagnoses: string[];
  appointments: AppointmentEntry[];
  consultations: Consultation[];
  reports: Report[];
  notes: PatientNote[];
}

type TimelineEvent =
  | { kind: "consultation"; date: string; data: Consultation }
  | { kind: "prescription"; date: string; data: PrescriptionEvent }
  | { kind: "appointment"; date: string; data: AppointmentEntry }
  | { kind: "report"; date: string; data: Report }
  | { kind: "note"; date: string; data: PatientNote };

const TYPE_META = {
  consultation: {
    icon: "🩺",
    bg: "#eff6ff",
    border: "#bfdbfe",
    textColor: "#1d4ed8",
    label: "Consultation",
  },
  prescription: {
    icon: "💊",
    bg: "#fdf4ff",
    border: "#e9d5ff",
    textColor: "#7c3aed",
    label: "Prescription",
  },
  appointment: {
    icon: "📅",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    textColor: "#6d28d9",
    label: "Appointment",
  },
  report: {
    icon: "📄",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    textColor: "#15803d",
    label: "Report",
  },
  note: {
    icon: "📝",
    bg: "#fffbeb",
    border: "#fde68a",
    textColor: "#92400e",
    label: "Note",
  },
} as const;

const REPORT_CATEGORY_LABELS: Record<string, string> = {
  blood_test: "Blood Test",
  imaging: "Imaging",
  biopsy: "Biopsy",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: colors.textMuted,
  confirmed: colors.primary,
  in_queue: "#7c3aed",
  in_progress: colors.warning,
  completed: colors.success,
  cancelled: colors.danger,
  no_show: colors.danger,
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function VitalsCard({ vitals }: { vitals: Vitals }) {
  const items = [
    { label: "Blood Pressure", value: vitals.bp },
    { label: "Pulse", value: vitals.pulse ? `${vitals.pulse} bpm` : null },
    { label: "Temperature", value: vitals.temperature ? `${vitals.temperature} °C` : null },
    { label: "SpO2", value: vitals.spo2 ? `${vitals.spo2}%` : null },
    { label: "Weight", value: vitals.weight ? `${vitals.weight} kg` : null },
    { label: "Height", value: vitals.height ? `${vitals.height} cm` : null },
    { label: "BMI", value: vitals.bmi },
  ].filter((i) => i.value);

  if (!items.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
      {items.map((item) => (
        <div key={item.label} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: "6px 12px", fontSize: font.sm }}>
          <span style={{ color: colors.textMuted }}>{item.label}: </span>
          <span style={{ fontWeight: 600, color: colors.text }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function TestOrderBadge({ order }: { order: TestOrder }) {
  if (order.is_completed) {
    return (
      <span style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: 999, fontSize: "11px", fontWeight: 600, flexShrink: 0 }}>
        ✓ Done
      </span>
    );
  }
  if (order.approval_status === "pending") {
    return (
      <span style={{ background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: 999, fontSize: "11px", fontWeight: 600, flexShrink: 0 }}>
        Awaiting Approval
      </span>
    );
  }
  return null;
}

function ConsultationCard({ c }: { c: Consultation }) {
  const [open, setOpen] = useState(true);

  const { data: testOrders = [] } = useQuery<TestOrder[]>({
    queryKey: ["test-orders", c.id],
    queryFn: () => testOrdersApi.listByConsultation(c.id),
    enabled: open,
    select: (orders) => orders.filter((o) => o.approval_status !== "rejected"),
  });

  return (
    <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: "hidden" }}>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px", background: "none", border: "none",
          borderBottom: open ? `1px solid ${colors.border}` : "none",
          cursor: "pointer",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: font.base, color: colors.text }}>
          Clinical Details
          {c.prescription && (
            <span style={{ color: colors.textMuted, fontWeight: 400, fontSize: font.sm, marginLeft: 10 }}>
              · 💊 Rx
            </span>
          )}
          {testOrders.length > 0 && (
            <span style={{ color: colors.textMuted, fontWeight: 400, fontSize: font.sm, marginLeft: 10 }}>
              · 🧪 {testOrders.length} test{testOrders.length !== 1 ? "s" : ""}
            </span>
          )}
          {c.is_draft && (
            <span style={{ marginLeft: 10, background: "#fef9c3", color: "#92400e", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: 999, border: "1px solid #fde68a" }}>
              Draft
            </span>
          )}
        </span>
        <span style={{ color: colors.textMuted, fontSize: font.sm }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "16px 20px" }}>
          {/* 2-column clinical grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Left: clinical text */}
            <div>
              {c.chief_complaints && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>CHIEF COMPLAINTS</div>
                  <div style={{ fontSize: font.base, color: colors.text }}>{c.chief_complaints}</div>
                </div>
              )}
              {c.clinical_findings && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>CLINICAL FINDINGS</div>
                  <div style={{ fontSize: font.base, color: colors.text }}>{c.clinical_findings}</div>
                </div>
              )}
              {c.diagnosis && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>DIAGNOSIS</div>
                  <div style={{ fontSize: font.base, color: colors.text, fontWeight: 500 }}>{c.diagnosis}</div>
                </div>
              )}
              {c.notes && (
                <div>
                  <div style={{ fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>NOTES</div>
                  <div style={{ fontSize: font.base, color: colors.textMuted }}>{c.notes}</div>
                </div>
              )}
            </div>

            {/* Right: vitals */}
            <div>
              {c.vitals && <VitalsCard vitals={c.vitals} />}
            </div>
          </div>

          {/* Lab tests — full-width row below clinical grid */}
          {testOrders.length > 0 && (
            <div style={{ marginTop: 20, borderTop: `1px solid ${colors.border}`, paddingTop: 16 }}>
              <div style={{ fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 10, letterSpacing: "0.05em" }}>
                🧪 LAB TESTS
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {testOrders.map((o) => (
                  <div key={o.id} style={{
                    background: colors.bg,
                    border: `1px solid ${o.approval_status === "pending" ? "#fde68a" : colors.border}`,
                    borderRadius: radius.md,
                    padding: "8px 14px",
                    fontSize: font.sm,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 0,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: colors.text }}>{o.test_name}</div>
                      {(o.lab_name || o.notes) && (
                        <div style={{ color: colors.textMuted, marginTop: 2, fontSize: "12px" }}>
                          {o.lab_name && <span>🏥 {o.lab_name}</span>}
                          {o.lab_name && o.notes && <span> · </span>}
                          {o.notes && <span style={{ fontStyle: "italic" }}>{o.notes}</span>}
                        </div>
                      )}
                    </div>
                    <TestOrderBadge order={o} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ a }: { a: AppointmentEntry }) {
  return (
    <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: "14px 20px", display: "flex", alignItems: "flex-start", gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: a.notes ? 6 : 0 }}>
          <span style={{ fontWeight: 600, color: colors.text, textTransform: "capitalize" }}>
            {a.appointment_type.replace(/_/g, " ")}
          </span>
          {a.token_number != null && (
            <span style={{ fontSize: font.sm, color: colors.textMuted }}>· Token #{a.token_number}</span>
          )}
        </div>
        {a.notes && (
          <div style={{ fontSize: font.sm, color: colors.textMuted }}>{a.notes}</div>
        )}
      </div>
      <span style={{
        color: STATUS_COLORS[a.status] ?? colors.textMuted,
        fontWeight: 600,
        fontSize: font.sm,
        textTransform: "capitalize",
        flexShrink: 0,
      }}>
        {a.status.replace(/_/g, " ")}
      </span>
    </div>
  );
}

function PrescriptionCard({ prx }: { prx: PrescriptionEvent }) {
  const isDraft = prx.status === "draft";
  return (
    <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontSize: "11px", fontWeight: 700, padding: "2px 10px", borderRadius: 999,
          background: isDraft ? "#fef9c3" : "#dcfce7",
          color: isDraft ? "#92400e" : "#15803d",
          border: `1px solid ${isDraft ? "#fde68a" : "#bbf7d0"}`,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}>
          {isDraft ? "Draft" : "Active"}
        </span>
        {prx.follow_up_date && (
          <span style={{ fontSize: font.sm, color: colors.primary, fontWeight: 500 }}>
            Follow-up: {prx.follow_up_date}
          </span>
        )}
      </div>

      {/* Medicine list */}
      <div style={{ padding: "12px 20px" }}>
        {prx.items.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: font.sm }}>No medicines added.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: font.sm }}>
            <thead>
              <tr style={{ background: colors.bg }}>
                {["Medicine", "Dosage (M-A-E)", "Duration", "Route", "Instructions"].map((h) => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prx.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: i < prx.items.length - 1 ? `1px solid ${colors.borderLight}` : "none" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 600, color: colors.text }}>{item.medicine_name}</td>
                  <td style={{ padding: "8px 10px", color: colors.text }}>{item.dosage}</td>
                  <td style={{ padding: "8px 10px", color: colors.text }}>{item.duration_days}d</td>
                  <td style={{ padding: "8px 10px", color: colors.textMuted, textTransform: "capitalize" }}>{item.route}</td>
                  <td style={{ padding: "8px 10px", color: colors.textMuted, fontStyle: item.instructions ? "normal" : "italic" }}>
                    {item.instructions || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ReportCard({ r }: { r: Report }) {
  return (
    <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: 16, border: `1px solid ${colors.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ background: "#f0fdf4", color: "#15803d", padding: "2px 10px", borderRadius: 999, fontSize: "12px", fontWeight: 600, border: "1px solid #bbf7d0" }}>
              {REPORT_CATEGORY_LABELS[r.category] ?? r.category}
            </span>
          </div>
          <div style={{ fontWeight: 600, fontSize: font.base, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.original_filename}>
            {r.original_filename}
          </div>
          <div style={{ fontSize: font.sm, color: colors.textMuted, marginTop: 2 }}>
            {r.uploaded_by_name && `Uploaded by ${r.uploaded_by_name}`}
          </div>
          {r.notes && (
            <div style={{ fontSize: font.sm, color: colors.textMuted, marginTop: 4, fontStyle: "italic" }}>{r.notes}</div>
          )}
        </div>
        <span style={{ fontSize: "20px", marginLeft: 12, flexShrink: 0 }}>📄</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={() => viewReport(r.id)}
          style={{
            flex: 1,
            padding: "7px 0",
            background: colors.primaryLight,
            color: colors.primary,
            border: `1px solid ${colors.primary}`,
            borderRadius: radius.md,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: font.sm,
          }}
        >
          👁 View
        </button>
        <button
          onClick={() => downloadReport(r.id, r.original_filename)}
          style={{
            flex: 1,
            padding: "7px 0",
            background: colors.white,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: font.sm,
          }}
        >
          ⬇ Download
        </button>
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  doctor: "Doctor",
  assistant_doctor: "Asst. Doctor",
  receptionist: "Receptionist",
  assistant: "Assistant",
  admin: "Admin",
  super_admin: "Admin",
  trainee: "Trainee",
};

function NoteCard({ note }: { note: PatientNote }) {
  return (
    <div style={{
      background: colors.white,
      borderRadius: radius.lg,
      boxShadow: shadow.sm,
      padding: "14px 20px",
      borderLeft: `3px solid #fbbf24`,
    }}>
      <p style={{ margin: "0 0 10px", fontSize: font.base, color: colors.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {note.content}
      </p>
      <div style={{ fontSize: font.sm, color: colors.textMuted, display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontWeight: 600, color: colors.text }}>{note.created_by_name || "Unknown"}</span>
        {note.created_by_role && (
          <span style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 999, padding: "1px 8px", fontSize: "11px", fontWeight: 600, color: colors.textMuted }}>
            {ROLE_LABELS[note.created_by_role] ?? note.created_by_role}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Report helpers ───────────────────────────────────────────────────────────

async function viewReport(reportId: string) {
  const win = window.open("about:blank", "_blank");
  if (!win) { alert("Popup blocked — please allow popups for this site."); return; }
  try {
    const res = await apiClient.get(`/reports/${reportId}/file/`, { responseType: "blob" });
    const blob = new Blob([res.data], { type: res.headers["content-type"] ?? "application/octet-stream" });
    win.location.href = URL.createObjectURL(blob);
  } catch {
    win.close();
    alert("Failed to open the report. Please try again.");
  }
}

async function downloadReport(reportId: string, filename: string) {
  try {
    const res = await apiClient.get(`/reports/${reportId}/file/?download=1`, { responseType: "blob" });
    const blob = new Blob([res.data], { type: res.headers["content-type"] ?? "application/octet-stream" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch {
    alert("Failed to download the report. Please try again.");
  }
}

// ─── Upload panel ─────────────────────────────────────────────────────────────

const UPLOAD_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: "blood_test", label: "Blood Test" },
  { value: "imaging", label: "Imaging" },
  { value: "biopsy", label: "Biopsy" },
  { value: "other", label: "Other" },
];

function UploadPanel({ patientId, onSuccess, onCancel }: {
  patientId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<ReportCategory>("blood_test");
  const [notes, setNotes] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      reportsApi.upload({ patient_id: patientId, file: file!, category, notes: notes || undefined }),
    onSuccess,
    onError: (err: any) => {
      setError(err?.response?.data?.error ?? "Upload failed. Please try again.");
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setError(""); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) { setFile(picked); setError(""); }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding: 20,
      marginBottom: 20,
    }}>
      <h3 style={{ margin: "0 0 16px", fontSize: font.base, fontWeight: 700, color: colors.text }}>
        Upload Report
      </h3>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? colors.primary : colors.border}`,
          borderRadius: radius.md,
          padding: "24px 16px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? colors.primaryLight : colors.white,
          transition: "all 0.15s",
          marginBottom: 16,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        {file ? (
          <div>
            <div style={{ fontSize: "24px", marginBottom: 4 }}>📄</div>
            <div style={{ fontWeight: 600, color: colors.text, fontSize: font.base }}>{file.name}</div>
            <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>{formatBytes(file.size)}</div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              style={{ marginTop: 8, background: "none", border: "none", color: colors.danger, cursor: "pointer", fontSize: font.sm }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "28px", marginBottom: 6 }}>📁</div>
            <div style={{ color: colors.text, fontSize: font.base, fontWeight: 500 }}>
              Drag & drop or <span style={{ color: colors.primary }}>browse</span>
            </div>
            <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 4 }}>
              PDF, JPG, PNG accepted
            </div>
          </div>
        )}
      </div>

      {/* Category picker */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Category
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {UPLOAD_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              style={{
                padding: "5px 14px",
                border: `1.5px solid ${category === cat.value ? colors.primary : colors.border}`,
                borderRadius: 999,
                background: category === cat.value ? colors.primaryLight : colors.white,
                color: category === cat.value ? colors.primary : colors.textMuted,
                cursor: "pointer",
                fontSize: font.sm,
                fontWeight: category === cat.value ? 600 : 400,
                transition: "all 0.12s",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Notes <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Result summary, reference range, etc."
          rows={2}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            fontSize: font.base,
            color: colors.text,
            background: colors.white,
            resize: "vertical",
            boxSizing: "border-box",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </div>

      {error && (
        <div style={{ color: colors.danger, fontSize: font.sm, marginBottom: 12 }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => mutation.mutate()}
          disabled={!file || mutation.isPending}
          style={{
            padding: "8px 20px",
            background: !file || mutation.isPending ? colors.border : colors.primary,
            color: colors.white,
            border: "none",
            borderRadius: radius.md,
            cursor: !file || mutation.isPending ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: font.base,
          }}
        >
          {mutation.isPending ? "Uploading…" : "Upload"}
        </button>
        <button
          onClick={onCancel}
          disabled={mutation.isPending}
          style={{
            padding: "8px 16px",
            background: "none",
            color: colors.textMuted,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            cursor: "pointer",
            fontSize: font.base,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddNotePanel({ patientId, onSuccess, onCancel }: {
  patientId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/patients/${patientId}/notes/`, { content }).then((r) => r.data),
    onSuccess,
    onError: (err: any) => {
      setError(err?.response?.data?.error ?? "Failed to save note. Please try again.");
    },
  });

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      padding: 20,
      marginBottom: 20,
    }}>
      <h3 style={{ margin: "0 0 12px", fontSize: font.base, fontWeight: 700, color: colors.text }}>
        Add Note
      </h3>
      <textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); setError(""); }}
        placeholder="Enter note — administrative observations, reminders, or anything not part of a formal consultation…"
        rows={4}
        autoFocus
        style={{
          width: "100%",
          padding: "10px 14px",
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          fontSize: font.base,
          color: colors.text,
          background: colors.white,
          resize: "vertical",
          boxSizing: "border-box",
          outline: "none",
          fontFamily: "inherit",
          lineHeight: 1.6,
          marginBottom: 12,
        }}
      />
      {error && (
        <div style={{ color: colors.danger, fontSize: font.sm, marginBottom: 10 }}>{error}</div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => mutation.mutate()}
          disabled={!content.trim() || mutation.isPending}
          style={{
            padding: "8px 20px",
            background: !content.trim() || mutation.isPending ? colors.border : colors.primary,
            color: colors.white,
            border: "none",
            borderRadius: radius.md,
            cursor: !content.trim() || mutation.isPending ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: font.base,
          }}
        >
          {mutation.isPending ? "Saving…" : "Save Note"}
        </button>
        <button
          onClick={onCancel}
          disabled={mutation.isPending}
          style={{
            padding: "8px 16px",
            background: "none",
            color: colors.textMuted,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            cursor: "pointer",
            fontSize: font.base,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [showUpload, setShowUpload] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  const canUpload = user?.role === "doctor" || user?.role === "assistant_doctor";
  const canAddNote = user?.role !== "trainee";

  const { data, isLoading, error } = useQuery<PatientHistory>({
    queryKey: ["patient-history", patientId],
    queryFn: () => apiClient.get(`/patients/${patientId}/history/`).then((r) => r.data),
    enabled: !!patientId,
  });

  if (isLoading) {
    return <AppShell><div style={{ padding: 40, color: colors.textMuted }}>Loading patient history…</div></AppShell>;
  }
  if (error || !data) {
    return <AppShell><div style={{ padding: 40, color: colors.danger }}>Failed to load patient history.</div></AppShell>;
  }

  const { patient, past_diagnoses, consultations, appointments, reports, notes } = data;

  // Appointments that already have a linked consultation — skip them from the
  // timeline so we don't double-count the same visit.
  const consultedAppointmentIds = new Set(consultations.map((c) => c.appointment_id));

  const timelineEvents: TimelineEvent[] = [
    ...consultations.map((c) => ({
      kind: "consultation" as const,
      date: c.created_at ?? c.completed_at ?? "",
      data: c,
    })),
    // Prescriptions extracted as standalone entries — same date as their
    // consultation so they sort adjacently; consultation is inserted first in
    // the array, so stable sort keeps it immediately above its prescription.
    ...consultations
      .filter((c) => c.prescription !== null)
      .map((c) => ({
        kind: "prescription" as const,
        date: c.created_at ?? c.completed_at ?? "",
        data: {
          prescription_id: c.prescription!.prescription_id,
          status: c.prescription!.status,
          follow_up_date: c.prescription!.follow_up_date,
          items: c.prescription!.items,
          consultation_id: c.id,
        } satisfies PrescriptionEvent,
      })),
    ...appointments
      .filter((a) => !consultedAppointmentIds.has(a.id))
      .map((a) => ({
        kind: "appointment" as const,
        date: a.scheduled_at,
        data: a,
      })),
    ...reports.map((r) => ({
      kind: "report" as const,
      date: r.uploaded_at,
      data: r,
    })),
    ...notes.map((n) => ({
      kind: "note" as const,
      date: n.created_at,
      data: n,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        {/* Back */}
        <button onClick={() => navigate("/patients")}
          style={{ background: "none", border: "none", color: colors.primary, cursor: "pointer", fontSize: font.base, padding: "0 0 16px", fontWeight: 500 }}>
          ← Back to Patients
        </button>

        {/* Patient card */}
        <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: colors.white, fontWeight: 700, fontSize: font.lg, flexShrink: 0 }}>
              {patient.full_name[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: "0 0 4px", fontSize: font.xl, fontWeight: 700, color: colors.text }}>{patient.full_name}</h1>
              <p style={{ margin: "0 0 12px", color: colors.textMuted, fontSize: font.sm }}>
                ID: {patient.patient_id} · {patient.phone} · {patient.gender === "M" ? "Male" : patient.gender === "F" ? "Female" : "Other"}
                {patient.age !== null && ` · ${patient.age} yrs`}
                {patient.date_of_birth && ` · DOB: ${patient.date_of_birth}`}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {patient.allergies.map((a) => (
                  <span key={a} style={{ background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca", padding: "2px 10px", borderRadius: 999, fontSize: "12px", fontWeight: 600 }}>⚠ {a}</span>
                ))}
                {patient.chronic_diseases.map((d) => (
                  <span key={d} style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", padding: "2px 10px", borderRadius: 999, fontSize: "12px", fontWeight: 600 }}>{d}</span>
                ))}
              </div>

              {past_diagnoses.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                    Past Diagnoses
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {past_diagnoses.map((d) => (
                      <span key={d} style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "2px 10px", borderRadius: 999, fontSize: "12px", fontWeight: 500 }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Summary stats */}
            <div style={{ display: "flex", gap: 24, textAlign: "center" }}>
              {[
                { label: "Visits", value: consultations.length },
                { label: "Appointments", value: appointments.length },
                { label: "Reports", value: reports.length },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: font.xl, fontWeight: 700, color: colors.text }}>{s.value}</div>
                  <div style={{ fontSize: font.sm, color: colors.textMuted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: "0 0 2px", fontSize: font.lg, fontWeight: 700, color: colors.text }}>
              Visit Timeline
            </h2>
            <div style={{ fontSize: font.sm, color: colors.textMuted }}>
              {timelineEvents.length === 0
                ? "No history recorded yet"
                : `${timelineEvents.length} ${timelineEvents.length === 1 ? "entry" : "entries"} · most recent first`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {canAddNote && !showAddNote && !showUpload && (
              <button
                onClick={() => setShowAddNote(true)}
                style={{
                  padding: "8px 16px",
                  background: colors.white,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.md,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: font.sm,
                }}
              >
                📝 Add Note
              </button>
            )}
            {canUpload && !showUpload && !showAddNote && (
              <button
                onClick={() => setShowUpload(true)}
                style={{
                  padding: "8px 16px",
                  background: colors.primary,
                  color: colors.white,
                  border: "none",
                  borderRadius: radius.md,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: font.sm,
                }}
              >
                + Upload Report
              </button>
            )}
          </div>
        </div>

        {/* Upload panel */}
        {showUpload && patientId && (
          <UploadPanel
            patientId={patientId}
            onSuccess={() => {
              setShowUpload(false);
              queryClient.invalidateQueries({ queryKey: ["patient-history", patientId] });
            }}
            onCancel={() => setShowUpload(false)}
          />
        )}

        {/* Add note panel */}
        {showAddNote && patientId && (
          <AddNotePanel
            patientId={patientId}
            onSuccess={() => {
              setShowAddNote(false);
              queryClient.invalidateQueries({ queryKey: ["patient-history", patientId] });
            }}
            onCancel={() => setShowAddNote(false)}
          />
        )}

        {/* Unified timeline */}
        {timelineEvents.length === 0 ? (
          <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: 40, textAlign: "center", color: colors.textMuted }}>
            No history recorded yet. Appointments, consultations, and reports will appear here.
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            {/* Vertical connector line */}
            <div style={{
              position: "absolute",
              left: 17,
              top: 36,
              bottom: 36,
              width: 2,
              background: colors.borderLight,
            }} />

            {timelineEvents.map((event, i) => {
              const meta = TYPE_META[event.kind];
              const dateLabel = event.date ? fmtDate(event.date) : "—";
              const timeLabel = event.kind === "appointment" ? fmtDateTime(event.date) : null;

              return (
                <div
                  key={`${event.kind}-${event.kind === "prescription" ? event.data.prescription_id : event.data.id}-${i}`}

                  style={{ display: "flex", gap: 16, marginBottom: 24 }}
                >
                  {/* Dot indicator */}
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: meta.bg,
                    border: `2px solid ${meta.border}`,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    position: "relative",
                    zIndex: 1,
                  }}>
                    {meta.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Date + type label */}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: font.base, color: colors.text }}>
                        {timeLabel ?? dateLabel}
                      </span>
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: meta.textColor,
                        background: meta.bg,
                        border: `1px solid ${meta.border}`,
                        padding: "1px 8px",
                        borderRadius: 999,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Card */}
                    {event.kind === "consultation" && <ConsultationCard c={event.data} />}
                    {event.kind === "prescription" && <PrescriptionCard prx={event.data} />}
                    {event.kind === "appointment" && <AppointmentCard a={event.data} />}
                    {event.kind === "report" && <ReportCard r={event.data} />}
                    {event.kind === "note" && <NoteCard note={event.data} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

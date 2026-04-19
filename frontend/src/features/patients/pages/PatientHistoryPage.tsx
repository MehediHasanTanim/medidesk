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

interface Report {
  id: string;
  category: string;
  file_url: string;
  original_filename: string;
  uploaded_by_name: string;
  uploaded_at: string;
  notes: string;
}

interface PatientHistory {
  patient: Patient;
  appointments: Array<{
    id: string;
    scheduled_at: string;
    appointment_type: string;
    status: string;
    token_number: number | null;
    notes: string;
  }>;
  consultations: Consultation[];
  reports: Report[];
}

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

// Badge helpers (shared with approval page pattern)
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
    // Don't show rejected tests in history
    select: (orders) => orders.filter((o) => o.approval_status !== "rejected"),
  });

  const title = c.created_at
    ? new Date(c.created_at).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })
    : "Consultation";

  return (
    <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, marginBottom: 20, overflow: "hidden" }}>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 24px", background: "none", border: "none",
          borderBottom: open ? `1px solid ${colors.border}` : "none",
          cursor: "pointer",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: font.md, color: colors.text }}>
          {title}
          {testOrders.length > 0 && (
            <span style={{ color: colors.textMuted, fontWeight: 400, fontSize: font.sm, marginLeft: 10 }}>
              · 🧪 {testOrders.length} test{testOrders.length !== 1 ? "s" : ""}
            </span>
          )}
        </span>
        <span style={{ color: colors.textMuted, fontSize: font.sm }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "16px 24px" }}>
          {/* ── 2-column clinical grid ── */}
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

            {/* Right: vitals + prescription */}
            <div>
              {c.vitals && <VitalsCard vitals={c.vitals} />}
              {c.prescription && (
                <div style={{ marginTop: c.vitals ? 16 : 0 }}>
                  <div style={{ fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 8 }}>PRESCRIPTION</div>
                  {c.prescription.items.map((item, i) => (
                    <div key={i} style={{ background: colors.bg, borderRadius: radius.md, padding: "8px 12px", marginBottom: 6, fontSize: font.sm }}>
                      <div style={{ fontWeight: 600, color: colors.text }}>{item.medicine_name}</div>
                      <div style={{ color: colors.textMuted, marginTop: 2 }}>
                        {item.dosage} · {item.duration_days} days · {item.route}
                        {item.instructions && ` · ${item.instructions}`}
                      </div>
                    </div>
                  ))}
                  {c.prescription.follow_up_date && (
                    <div style={{ marginTop: 8, fontSize: font.sm, color: colors.primary }}>
                      Follow-up: {c.prescription.follow_up_date}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Lab tests — full-width row below clinical grid ── */}
          {testOrders.length > 0 && (
            <div style={{
              marginTop: 20,
              borderTop: `1px solid ${colors.border}`,
              paddingTop: 16,
            }}>
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

async function viewReport(reportId: string) {
  // Open a blank tab immediately (synchronous) so popup blockers allow it,
  // then navigate it to the blob URL once the fetch resolves.
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

      {/* Error */}
      {error && (
        <div style={{ color: colors.danger, fontSize: font.sm, marginBottom: 12 }}>{error}</div>
      )}

      {/* Actions */}
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

export default function PatientHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<"consultations" | "appointments" | "reports">("consultations");
  const [showUpload, setShowUpload] = useState(false);

  const canUpload = user?.role === "doctor" || user?.role === "assistant_doctor";

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

  const { patient, consultations, appointments, reports } = data;

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
                {patient.allergies.length > 0 && patient.allergies.map((a) => (
                  <span key={a} style={{ background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca", padding: "2px 10px", borderRadius: 999, fontSize: "12px", fontWeight: 600 }}>⚠ {a}</span>
                ))}
                {patient.chronic_diseases.length > 0 && patient.chronic_diseases.map((d) => (
                  <span key={d} style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", padding: "2px 10px", borderRadius: 999, fontSize: "12px", fontWeight: 600 }}>{d}</span>
                ))}
              </div>
            </div>
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

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 20, background: colors.borderLight, borderRadius: radius.md, padding: 4, width: "fit-content" }}>
          {(["consultations", "appointments", "reports"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 18px", border: "none", borderRadius: radius.sm, cursor: "pointer",
                fontSize: font.base, fontWeight: 500, textTransform: "capitalize",
                background: activeTab === tab ? colors.white : "transparent",
                color: activeTab === tab ? colors.primary : colors.textMuted,
                boxShadow: activeTab === tab ? shadow.sm : "none",
              }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Consultations tab */}
        {activeTab === "consultations" && (
          consultations.length === 0
            ? <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: 40, textAlign: "center", color: colors.textMuted }}>No consultation records found.</div>
            : consultations.map((c) => <ConsultationCard key={c.id} c={c} />)
        )}

        {/* Appointments tab */}
        {activeTab === "appointments" && (
          <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: "hidden" }}>
            {appointments.length === 0
              ? <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>No appointments found.</div>
              : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: colors.bg }}>
                      {["Date & Time", "Type", "Token", "Status", "Notes"].map((h) => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: font.sm, fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((a) => (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                        <td style={{ padding: "10px 16px", fontSize: font.base }}>{new Date(a.scheduled_at).toLocaleString("en-BD")}</td>
                        <td style={{ padding: "10px 16px", fontSize: font.base, textTransform: "capitalize" }}>{a.appointment_type.replace("_", " ")}</td>
                        <td style={{ padding: "10px 16px", fontSize: font.base }}>{a.token_number ?? "—"}</td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ color: STATUS_COLORS[a.status] ?? colors.textMuted, fontWeight: 600, fontSize: font.sm, textTransform: "capitalize" }}>
                            {a.status.replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", color: colors.textMuted, fontSize: font.sm }}>{a.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}

        {/* Reports tab */}
        {activeTab === "reports" && (
          <div>
            {/* Header row with Upload button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: font.base, fontWeight: 600, color: colors.textMuted }}>
                {reports.length} report{reports.length !== 1 ? "s" : ""}
              </span>
              {canUpload && !showUpload && (
                <button
                  onClick={() => setShowUpload(true)}
                  style={{
                    padding: "7px 16px",
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

            {/* Report cards */}
            {reports.length === 0 ? (
              <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: 40, textAlign: "center", color: colors.textMuted }}>
                No reports uploaded yet.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {reports.map((r) => (
                  <div key={r.id} style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: 18, border: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", gap: 0 }}>
                    {/* Header row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ background: colors.primaryLight, color: colors.primary, padding: "2px 10px", borderRadius: 999, fontSize: "12px", fontWeight: 600 }}>
                        {REPORT_CATEGORY_LABELS[r.category] ?? r.category}
                      </span>
                      <span style={{ fontSize: "20px" }}>📄</span>
                    </div>

                    {/* Filename */}
                    <div style={{ fontWeight: 600, fontSize: font.base, color: colors.text, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.original_filename}>
                      {r.original_filename}
                    </div>

                    {/* Meta */}
                    <div style={{ fontSize: font.sm, color: colors.textMuted, marginBottom: r.notes ? 4 : 12 }}>
                      {new Date(r.uploaded_at).toLocaleDateString("en-BD")} · {r.uploaded_by_name}
                    </div>
                    {r.notes && (
                      <div style={{ fontSize: font.sm, color: colors.textMuted, marginBottom: 12, fontStyle: "italic" }}>{r.notes}</div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
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
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

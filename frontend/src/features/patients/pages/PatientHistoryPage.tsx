import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import apiClient from "@/shared/lib/apiClient";
import type { Patient } from "@/features/patients/api/patientsApi";

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

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, marginBottom: 20, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "none", border: "none", borderBottom: open ? `1px solid ${colors.border}` : "none", cursor: "pointer" }}
      >
        <span style={{ fontWeight: 600, fontSize: font.md, color: colors.text }}>
          {title} {count !== undefined && <span style={{ color: colors.textMuted, fontWeight: 400, fontSize: font.sm }}>({count})</span>}
        </span>
        <span style={{ color: colors.textMuted, fontSize: font.sm }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ padding: "16px 24px" }}>{children}</div>}
    </div>
  );
}

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

export default function PatientHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"consultations" | "appointments" | "reports">("consultations");

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
            : consultations.map((c) => (
              <Section key={c.id} title={c.created_at ? new Date(c.created_at).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" }) : "Consultation"}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
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
              </Section>
            ))
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
          reports.length === 0
            ? <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: 40, textAlign: "center", color: colors.textMuted }}>No reports uploaded.</div>
            : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {reports.map((r) => (
                  <a key={r.id} href={r.file_url} target="_blank" rel="noopener noreferrer"
                    style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: 18, textDecoration: "none", display: "block", border: `1px solid ${colors.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ background: colors.primaryLight, color: colors.primary, padding: "2px 10px", borderRadius: 999, fontSize: "12px", fontWeight: 600 }}>
                        {REPORT_CATEGORY_LABELS[r.category] ?? r.category}
                      </span>
                      <span style={{ fontSize: "18px" }}>📄</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: font.base, color: colors.text, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.original_filename}
                    </div>
                    <div style={{ fontSize: font.sm, color: colors.textMuted }}>
                      {new Date(r.uploaded_at).toLocaleDateString("en-BD")} · {r.uploaded_by_name}
                    </div>
                    {r.notes && <div style={{ fontSize: font.sm, color: colors.textMuted, marginTop: 4 }}>{r.notes}</div>}
                  </a>
                ))}
              </div>
            )
        )}
      </div>
    </AppShell>
  );
}

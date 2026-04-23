import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AppShell from "@/shared/components/AppShell";
import Toast, { useToast } from "@/shared/components/Toast";
import {
  patientsApi,
  type Patient,
  type RegisterPatientPayload,
  type UpdatePatientPayload,
} from "@/features/patients/api/patientsApi";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { useAuthStore } from "@/features/auth/store/authStore";

const PAGE_LIMIT = 20;

const inputStyle = {
  width: "100%", padding: "9px 12px",
  border: `1px solid ${colors.border}`, borderRadius: radius.md,
  fontSize: font.base, boxSizing: "border-box" as const,
  color: colors.text, background: colors.bg,
};

// ── Tag-list editor (allergies / chronic diseases) ─────────────────────────
function TagEditor({
  label, values, onChange,
}: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>{label}</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        {values.map((v) => (
          <span key={v} style={{ background: colors.primaryLight, color: colors.primary, padding: "2px 10px", borderRadius: 999, fontSize: font.sm, display: "flex", alignItems: "center", gap: 4 }}>
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} style={{ background: "none", border: "none", cursor: "pointer", color: colors.primary, fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Type and press Enter…"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={add} style={{ padding: "8px 14px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}>Add</button>
      </div>
    </div>
  );
}

// ── Register modal ─────────────────────────────────────────────────────────
function RegisterModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<RegisterPatientPayload>({
    full_name: "", phone: "", gender: "M", address: "",
    date_of_birth: "", age_years: null, email: "", national_id: "",
    allergies: [], chronic_diseases: [], family_history: "",
  });
  const [error, setError] = useState("");
  const set = (k: keyof RegisterPatientPayload, v: string | string[] | number | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => patientsApi.register({
      ...form,
      date_of_birth: form.date_of_birth || null,
      age_years: form.date_of_birth ? null : (form.age_years ?? null),
      email: form.email || null,
      national_id: form.national_id || null,
    }),
    onSuccess: () => { onDone(); onClose(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Failed to register patient.");
    },
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: colors.white, borderRadius: radius.lg, padding: 32, width: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: shadow.lg }}>
        <h3 style={{ margin: "0 0 20px", fontSize: font.lg, fontWeight: 600 }}>Register New Patient</h3>
        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 14px", borderRadius: radius.md, marginBottom: 16, fontSize: font.base }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ gridColumn: "1 / -1", marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Full Name *</label>
            <input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Phone *</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Gender *</label>
            <select value={form.gender} onChange={(e) => set("gender", e.target.value)} style={inputStyle}>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1", marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Address *</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Date of Birth</label>
            <input type="date" value={form.date_of_birth ?? ""} onChange={(e) => { set("date_of_birth", e.target.value); if (e.target.value) set("age_years", null); }} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>
              Age (years){form.date_of_birth ? "" : " *"}
            </label>
            <input
              type="number" min={0} max={150}
              value={form.date_of_birth ? "" : (form.age_years ?? "")}
              disabled={!!form.date_of_birth}
              placeholder={form.date_of_birth ? "Computed from DOB" : "Enter age"}
              onChange={(e) => set("age_years", e.target.value ? parseInt(e.target.value, 10) : null)}
              style={{ ...inputStyle, background: form.date_of_birth ? colors.borderLight : colors.bg, color: form.date_of_birth ? colors.textMuted : colors.text }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>National ID</label>
            <input value={form.national_id ?? ""} onChange={(e) => set("national_id", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1", marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Email</label>
            <input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} style={inputStyle} />
          </div>
        </div>

        <TagEditor label="Allergies" values={form.allergies ?? []} onChange={(v) => set("allergies", v)} />
        <TagEditor label="Chronic Diseases" values={form.chronic_diseases ?? []} onChange={(v) => set("chronic_diseases", v)} />

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Family History</label>
          <textarea value={form.family_history ?? ""} onChange={(e) => set("family_history", e.target.value)} rows={2}
            style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", background: colors.borderLight, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}>Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} style={{ padding: "8px 18px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}>
            {mutation.isPending ? "Registering…" : "Register"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit modal ─────────────────────────────────────────────────────────────
function EditModal({ patient, onClose, onDone }: { patient: Patient; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<UpdatePatientPayload>({
    full_name: patient.full_name,
    phone: patient.phone,
    gender: patient.gender,
    address: patient.address,
    date_of_birth: patient.date_of_birth ?? "",
    age_years: patient.age_years ?? null,
    email: patient.email ?? "",
    national_id: patient.national_id ?? "",
    allergies: patient.allergies,
    chronic_diseases: patient.chronic_diseases,
    family_history: patient.family_history,
  });
  const [error, setError] = useState("");
  const set = (k: keyof UpdatePatientPayload, v: string | string[] | number | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => patientsApi.update(patient.id, {
      ...form,
      date_of_birth: (form.date_of_birth as string) || null,
      age_years: form.date_of_birth ? null : (form.age_years ?? null),
      email: (form.email as string) || null,
      national_id: (form.national_id as string) || null,
    }),
    onSuccess: () => { onDone(); onClose(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? "Failed to update patient.");
    },
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: colors.white, borderRadius: radius.lg, padding: 32, width: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: shadow.lg }}>
        <h3 style={{ margin: "0 0 4px", fontSize: font.lg, fontWeight: 600 }}>Edit Patient</h3>
        <p style={{ margin: "0 0 20px", color: colors.textMuted, fontSize: font.sm }}>{patient.patient_id}</p>
        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 14px", borderRadius: radius.md, marginBottom: 16, fontSize: font.base }}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ gridColumn: "1 / -1", marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Full Name</label>
            <input value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Phone</label>
            <input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Gender</label>
            <select value={form.gender ?? "M"} onChange={(e) => set("gender", e.target.value)} style={inputStyle}>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1", marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Address</label>
            <input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Date of Birth</label>
            <input type="date" value={form.date_of_birth as string ?? ""} onChange={(e) => { set("date_of_birth", e.target.value); if (e.target.value) set("age_years", null); }} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>
              Age (years){form.date_of_birth ? "" : " *"}
            </label>
            <input
              type="number" min={0} max={150}
              value={form.date_of_birth ? "" : (form.age_years ?? "")}
              disabled={!!form.date_of_birth}
              placeholder={form.date_of_birth ? "Computed from DOB" : "Enter age"}
              onChange={(e) => set("age_years", e.target.value ? parseInt(e.target.value, 10) : null)}
              style={{ ...inputStyle, background: form.date_of_birth ? colors.borderLight : colors.bg, color: form.date_of_birth ? colors.textMuted : colors.text }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>National ID</label>
            <input value={form.national_id as string ?? ""} onChange={(e) => set("national_id", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1", marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Email</label>
            <input type="email" value={form.email as string ?? ""} onChange={(e) => set("email", e.target.value)} style={inputStyle} />
          </div>
        </div>

        <TagEditor label="Allergies" values={form.allergies ?? []} onChange={(v) => set("allergies", v)} />
        <TagEditor label="Chronic Diseases" values={form.chronic_diseases ?? []} onChange={(v) => set("chronic_diseases", v)} />

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Family History</label>
          <textarea value={form.family_history ?? ""} onChange={(e) => set("family_history", e.target.value)} rows={2}
            style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", background: colors.borderLight, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.md, cursor: "pointer", fontSize: font.base }}>Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} style={{ padding: "8px 18px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}>
            {mutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function PatientsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canAccess } = useAuthStore();
  const canRegister = canAccess(["doctor", "receptionist", "assistant"]);
  const canViewHistory = canAccess(["doctor", "assistant_doctor"]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showRegister, setShowRegister] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", search, offset],
    queryFn: () => patientsApi.search({ q: search || undefined, limit: PAGE_LIMIT, offset }),
  });

  const patients = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_LIMIT);
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["patients"] });

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>Patients</h1>
            <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
              Search and manage patient records
            </p>
          </div>
          {canRegister && (
            <button
              onClick={() => setShowRegister(true)}
              style={{ padding: "9px 20px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}
            >
              + Register Patient
            </button>
          )}
        </div>

        {/* Search + count */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 480 }}>
            <input
              placeholder="Search by name, phone, or patient ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ width: "100%", padding: "9px 36px 9px 12px", borderRadius: radius.md, border: `1px solid ${colors.border}`, fontSize: font.base, boxSizing: "border-box", color: colors.text, background: colors.white }}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: colors.textMuted, cursor: "pointer", fontSize: 13, padding: 2 }}
              >✕</button>
            )}
          </div>
          {!isLoading && (
            <span style={{ color: colors.textMuted, fontSize: font.sm, marginLeft: "auto" }}>
              {total} patient{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Table */}
        <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>Loading…</div>
          ) : patients.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>
              {search ? `No patients found for "${search}".` : "No patients registered yet."}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: colors.bg }}>
                  {["Patient ID", "Name", "Phone", "Age", "Gender", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: font.sm, fontWeight: 600, color: colors.textMuted, borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                    <td style={{ padding: "12px 16px", color: colors.primary, fontWeight: 500, fontSize: font.base }}>{p.patient_id}</td>
                    <td style={{ padding: "12px 16px", color: colors.text, fontWeight: 500, fontSize: font.base }}>{p.full_name}</td>
                    <td style={{ padding: "12px 16px", color: colors.textMuted, fontSize: font.base }}>{p.phone}</td>
                    <td style={{ padding: "12px 16px", color: colors.textMuted, fontSize: font.base }}>{p.age ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: colors.textMuted, fontSize: font.base }}>
                      {p.gender === "M" ? "Male" : p.gender === "F" ? "Female" : "Other"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {canRegister && (
                          <button
                            onClick={() => setEditPatient(p)}
                            style={{ padding: "4px 12px", background: colors.primaryLight, color: colors.primary, border: `1px solid #bfdbfe`, borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}
                          >
                            Edit
                          </button>
                        )}
                        {canViewHistory && (
                          <button
                            onClick={() => navigate(`/patients/${p.id}/history`)}
                            style={{ padding: "4px 12px", background: colors.borderLight, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}
                          >
                            History
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <span style={{ color: colors.textMuted, fontSize: font.sm }}>
              Page {currentPage} of {totalPages} · {total} total
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setOffset(0)} disabled={currentPage === 1}
                style={{ padding: "6px 12px", border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.white, cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: font.sm, opacity: currentPage === 1 ? 0.5 : 1 }}>«</button>
              <button onClick={() => setOffset((o) => Math.max(0, o - PAGE_LIMIT))} disabled={currentPage === 1}
                style={{ padding: "6px 14px", border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.white, cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: font.sm, opacity: currentPage === 1 ? 0.5 : 1 }}>‹ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - currentPage) <= 2)
                .map((p) => (
                  <button key={p} onClick={() => setOffset((p - 1) * PAGE_LIMIT)}
                    style={{ padding: "6px 12px", border: `1px solid ${p === currentPage ? colors.primary : colors.border}`, borderRadius: radius.md, background: p === currentPage ? colors.primary : colors.white, color: p === currentPage ? colors.white : colors.text, cursor: "pointer", fontSize: font.sm, fontWeight: p === currentPage ? 600 : 400 }}>
                    {p}
                  </button>
                ))}
              <button onClick={() => setOffset((o) => Math.min((totalPages - 1) * PAGE_LIMIT, o + PAGE_LIMIT))} disabled={currentPage === totalPages}
                style={{ padding: "6px 14px", border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.white, cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontSize: font.sm, opacity: currentPage === totalPages ? 0.5 : 1 }}>Next ›</button>
              <button onClick={() => setOffset((totalPages - 1) * PAGE_LIMIT)} disabled={currentPage === totalPages}
                style={{ padding: "6px 12px", border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.white, cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontSize: font.sm, opacity: currentPage === totalPages ? 0.5 : 1 }}>»</button>
            </div>
          </div>
        )}
      </div>

      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onDone={() => { invalidate(); showToast("Patient registered successfully"); }}
        />
      )}
      {editPatient && (
        <EditModal
          patient={editPatient}
          onClose={() => setEditPatient(null)}
          onDone={() => { invalidate(); showToast("Patient updated successfully"); }}
        />
      )}

      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismissToast} />
    </AppShell>
  );
}

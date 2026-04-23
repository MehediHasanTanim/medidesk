import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import Toast, { useToast } from "@/shared/components/Toast";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { chambersApi } from "@/features/chambers/api/chambersApi";
import { usersApi } from "@/features/users/api/usersApi";
import {
  doctorProfilesApi,
  specialitiesApi,
  type CreateDoctorPayload,
  type CreateSpecialityPayload,
  type DoctorProfile,
  type Speciality,
  type UpdateDoctorPayload,
  type UpdateSpecialityPayload,
} from "@/features/doctors/api/doctorsApi";

// BD clinic week starts Saturday
const VISIT_DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

// ── Shared helpers ─────────────────────────────────────────────────────────

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: radius.md,
  border: `1px solid ${colors.border}`,
  fontSize: font.base,
  boxSizing: "border-box" as const,
  background: colors.white,
};

const labelStyle = {
  display: "block",
  fontSize: font.sm,
  fontWeight: 600 as const,
  color: colors.textMuted,
  marginBottom: 5,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};

const sectionHeadStyle = {
  fontSize: font.sm,
  fontWeight: 700 as const,
  color: colors.text,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  padding: "10px 0 6px",
  borderBottom: `1px solid ${colors.borderLight}`,
  marginBottom: 14,
};

function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ── DayPicker ──────────────────────────────────────────────────────────────

function DayPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (days: string[]) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {VISIT_DAYS.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d])}
            style={{
              padding: "4px 10px",
              border: `1px solid ${on ? colors.primary : colors.border}`,
              borderRadius: radius.full,
              background: on ? colors.primaryLight : colors.white,
              color: on ? colors.primary : colors.textMuted,
              cursor: "pointer",
              fontSize: font.sm,
              fontWeight: on ? 600 : 400,
            }}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

// ── ChamberCheckList ───────────────────────────────────────────────────────

function ChamberCheckList({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { data: chambers = [] } = useQuery({
    queryKey: ["chambers"],
    queryFn: () => chambersApi.list(false),
  });

  if (chambers.length === 0)
    return <p style={{ color: colors.textMuted, fontSize: font.sm }}>No chambers available.</p>;

  return (
    <div
      style={{
        maxHeight: 120,
        overflowY: "auto",
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: "6px 10px",
      }}
    >
      {chambers.map((c: any) => (
        <label
          key={c.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 0",
            cursor: "pointer",
            fontSize: font.sm,
          }}
        >
          <input
            type="checkbox"
            checked={selected.includes(c.id)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...selected, c.id]
                  : selected.filter((id) => id !== c.id)
              )
            }
          />
          {c.name}
        </label>
      ))}
    </div>
  );
}

// ── DoctorForm (shared between create and edit) ────────────────────────────

interface ChamberScheduleFormItem {
  chamber_id: string;
  visit_days: string[];
  visit_time_start: string;
  visit_time_end: string;
}

interface DoctorFormState {
  full_name: string;
  username: string;
  email: string;
  password: string;
  role: "doctor" | "assistant_doctor";
  speciality_id: string;
  qualifications: string;
  bio: string;
  consultation_fee: string;
  experience_years: string;
  is_available: boolean;
  is_active: boolean;
  chamber_ids: string[];
  chamber_schedules: ChamberScheduleFormItem[];
  supervisor_doctor_id: string;
  existing_user_id: string;
}

function emptyForm(): DoctorFormState {
  return {
    full_name: "",
    username: "",
    email: "",
    password: "",
    role: "doctor",
    speciality_id: "",
    qualifications: "",
    bio: "",
    consultation_fee: "",
    experience_years: "",
    is_available: true,
    is_active: true,
    chamber_ids: [],
    chamber_schedules: [],
    supervisor_doctor_id: "",
    existing_user_id: "",
  };
}

function fromProfile(p: DoctorProfile): DoctorFormState {
  return {
    full_name: p.full_name,
    username: p.username,
    email: p.email,
    password: "",
    role: p.role,
    speciality_id: p.speciality_id,
    qualifications: p.qualifications,
    bio: p.bio,
    consultation_fee: p.consultation_fee != null ? String(p.consultation_fee) : "",
    experience_years: p.experience_years != null ? String(p.experience_years) : "",
    is_available: p.is_available,
    is_active: p.is_active,
    chamber_ids: p.chamber_ids,
    chamber_schedules: (p.chamber_schedules ?? []).map((cs) => ({
      chamber_id: cs.chamber_id,
      visit_days: cs.visit_days,
      visit_time_start: cs.visit_time_start ?? "",
      visit_time_end: cs.visit_time_end ?? "",
    })),
    supervisor_doctor_id: p.supervisor_doctor_id ?? "",
    existing_user_id: "",
  };
}

interface DoctorFormProps {
  form: DoctorFormState;
  setForm: React.Dispatch<React.SetStateAction<DoctorFormState>>;
  specialities: Speciality[];
  isEdit: boolean;
}

function DoctorFormFields({ form, setForm, specialities, isEdit }: DoctorFormProps) {
  const set = (field: keyof DoctorFormState, value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  const { data: doctorOptions = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => usersApi.doctors(),
    enabled: form.role === "assistant_doctor",
  });

  // Chambers list needed for schedule display labels
  const { data: allChambers = [] } = useQuery({
    queryKey: ["chambers"],
    queryFn: () => chambersApi.list(false),
  });

  // When chamber selection changes, keep chamber_schedules in sync
  const handleChamberChange = (ids: string[]) => {
    setForm((f) => {
      const newSchedules: ChamberScheduleFormItem[] = ids.map(
        (id) =>
          f.chamber_schedules.find((cs) => cs.chamber_id === id) ?? {
            chamber_id: id,
            visit_days: [],
            visit_time_start: "",
            visit_time_end: "",
          }
      );
      return { ...f, chamber_ids: ids, chamber_schedules: newSchedules };
    });
  };

  // Update a single field within one chamber's schedule
  const updateSchedule = (
    chamberId: string,
    patch: Partial<ChamberScheduleFormItem>
  ) => {
    setForm((f) => ({
      ...f,
      chamber_schedules: f.chamber_schedules.map((cs) =>
        cs.chamber_id === chamberId ? { ...cs, ...patch } : cs
      ),
    }));
  };

  return (
    <>
      {/* ── Account ─────────────────────── */}
      <div style={sectionHeadStyle}>Account</div>
      <FieldRow>
        <Field label="Full Name *">
          <input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Dr. Rahim Uddin"
            style={{ ...inputStyle, background: (isEdit || !!form.existing_user_id) ? colors.bg : colors.white }}
            disabled={isEdit || !!form.existing_user_id}
          />
        </Field>
        {!form.existing_user_id && (
          <Field label={isEdit ? "Username" : "Username *"}>
            <input
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              placeholder="dr.rahim"
              style={{ ...inputStyle, background: isEdit ? colors.bg : colors.white }}
              disabled={isEdit}
            />
          </Field>
        )}
      </FieldRow>
      <FieldRow>
        <Field label="Email *">
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            style={{ ...inputStyle, background: !!form.existing_user_id ? colors.bg : colors.white }}
            disabled={!!form.existing_user_id}
          />
        </Field>
        {!isEdit && !form.existing_user_id ? (
          <Field label="Password *">
            <input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              style={inputStyle}
            />
          </Field>
        ) : isEdit ? (
          <Field label="Status">
            <label style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
              />
              <span style={{ fontSize: font.sm }}>Active account</span>
            </label>
          </Field>
        ) : null}
      </FieldRow>
      <FieldRow>
        <Field label="Role *">
          <select
            value={form.role}
            onChange={(e) => {
              const newRole = e.target.value as "doctor" | "assistant_doctor";
              setForm((f) => ({ ...f, role: newRole, supervisor_doctor_id: newRole === "doctor" ? "" : f.supervisor_doctor_id }));
            }}
            style={inputStyle}
          >
            <option value="doctor">Doctor</option>
            <option value="assistant_doctor">Assistant Doctor</option>
          </select>
        </Field>
        <Field label="Speciality *">
          <select
            value={form.speciality_id}
            onChange={(e) => set("speciality_id", e.target.value)}
            style={inputStyle}
          >
            <option value="">Select speciality…</option>
            {specialities.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </FieldRow>

      {form.role === "assistant_doctor" && (
        <div style={{ marginBottom: 14 }}>
          <Field label={<>Supervisor Doctor <span style={{ color: "#dc2626" }}>*</span></>}>
            <select
              value={form.supervisor_doctor_id}
              onChange={(e) => set("supervisor_doctor_id", e.target.value)}
              style={inputStyle}
            >
              <option value="">— Select a doctor —</option>
              {doctorOptions.filter((d) => d.role === "doctor").map((d) => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {/* ── Professional ─────────────────── */}
      <div style={sectionHeadStyle}>Professional</div>
      <div style={{ marginBottom: 14 }}>
        <Field label="Qualifications *">
          <input
            value={form.qualifications}
            onChange={(e) => set("qualifications", e.target.value)}
            placeholder="MBBS, MD (Cardiology), FCPS"
            style={inputStyle}
          />
        </Field>
      </div>
      <FieldRow>
        <Field label="Experience (years)">
          <input
            type="number"
            min={0}
            value={form.experience_years}
            onChange={(e) => set("experience_years", e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Consultation Fee (৳)">
          <input
            type="number"
            min={0}
            value={form.consultation_fee}
            onChange={(e) => set("consultation_fee", e.target.value)}
            style={inputStyle}
          />
        </Field>
      </FieldRow>
      <div style={{ marginBottom: 14 }}>
        <Field label="Bio">
          <textarea
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </Field>
      </div>

      {/* ── Chambers & Visit Schedule ─────── */}
      <div style={sectionHeadStyle}>Chambers &amp; Visit Schedule</div>
      <div style={{ marginBottom: 12 }}>
        <ChamberCheckList
          selected={form.chamber_ids}
          onChange={handleChamberChange}
        />
      </div>

      {/* Per-chamber schedule rows */}
      {form.chamber_ids.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {form.chamber_ids.map((chamberId) => {
            const chamber = allChambers.find((c: any) => c.id === chamberId);
            const sched =
              form.chamber_schedules.find((cs) => cs.chamber_id === chamberId) ?? {
                chamber_id: chamberId,
                visit_days: [],
                visit_time_start: "",
                visit_time_end: "",
              };

            return (
              <div
                key={chamberId}
                style={{
                  marginBottom: 10,
                  padding: "12px 14px",
                  background: "#f8fafc",
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: radius.md,
                }}
              >
                <div
                  style={{
                    fontSize: font.sm,
                    fontWeight: 700,
                    color: colors.text,
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  🏥 {chamber?.name ?? "Chamber"}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={labelStyle}>Visit Days</label>
                  <DayPicker
                    value={sched.visit_days}
                    onChange={(days) =>
                      updateSchedule(chamberId, { visit_days: days })
                    }
                  />
                </div>
                <FieldRow>
                  <Field label="From">
                    <input
                      type="time"
                      value={sched.visit_time_start}
                      onChange={(e) =>
                        updateSchedule(chamberId, { visit_time_start: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="To">
                    <input
                      type="time"
                      value={sched.visit_time_end}
                      onChange={(e) =>
                        updateSchedule(chamberId, { visit_time_end: e.target.value })
                      }
                      style={inputStyle}
                    />
                  </Field>
                </FieldRow>
              </div>
            );
          })}
        </div>
      )}

      {isEdit && (
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(e) => set("is_available", e.target.checked)}
            />
            <span style={{ fontSize: font.sm, fontWeight: 500 }}>Available for appointments</span>
          </label>
        </div>
      )}
    </>
  );
}

// ── CreateDoctorModal ──────────────────────────────────────────────────────

function CreateDoctorModal({
  specialities,
  onClose,
  onCreated,
  prefill,
}: {
  specialities: Speciality[];
  onClose: () => void;
  onCreated: () => void;
  prefill?: DoctorProfile;
}) {
  const [form, setForm] = useState<DoctorFormState>(() =>
    prefill
      ? {
          ...emptyForm(),
          full_name: prefill.full_name,
          username: prefill.username,
          email: prefill.email,
          role: prefill.role,
          chamber_ids: prefill.chamber_ids,
          supervisor_doctor_id: prefill.supervisor_doctor_id ?? "",
          existing_user_id: prefill.user_id,
        }
      : emptyForm()
  );
  const [error, setError] = useState("");
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: CreateDoctorPayload) => doctorProfilesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-profiles"] });
      onCreated();
    },
    onError: (e: any) => setError(e.response?.data?.error ?? "Failed to create doctor"),
  });

  const handleSubmit = () => {
    setError("");
    if (!form.speciality_id) return setError("Select a speciality");
    if (!form.qualifications.trim()) return setError("Qualifications are required");
    if (form.role === "assistant_doctor" && !form.supervisor_doctor_id) return setError("Select a supervisor doctor");
    if (!form.existing_user_id) {
      if (!form.username.trim()) return setError("Username is required");
      if (!form.password) return setError("Password is required");
      if (!form.email.trim()) return setError("Email is required");
      if (!form.full_name.trim()) return setError("Full name is required");
    }

    mutation.mutate({
      full_name: form.full_name,
      username: form.username,
      password: form.password,
      email: form.email,
      role: form.role,
      speciality_id: form.speciality_id,
      qualifications: form.qualifications,
      bio: form.bio,
      consultation_fee: form.consultation_fee ? parseFloat(form.consultation_fee) : null,
      experience_years: form.experience_years ? parseInt(form.experience_years) : null,
      is_available: form.is_available,
      chamber_ids: form.chamber_ids,
      chamber_schedules: form.chamber_schedules.map((cs) => ({
        chamber_id: cs.chamber_id,
        visit_days: cs.visit_days,
        visit_time_start: cs.visit_time_start || null,
        visit_time_end: cs.visit_time_end || null,
      })),
      supervisor_doctor_id: form.supervisor_doctor_id || null,
      existing_user_id: form.existing_user_id || null,
    });
  };

  return <DoctorModal title="Add Doctor" error={error} isPending={mutation.isPending} onClose={onClose} onSubmit={handleSubmit}>
    <DoctorFormFields form={form} setForm={setForm} specialities={specialities} isEdit={false} />
  </DoctorModal>;
}

// ── EditDoctorModal ────────────────────────────────────────────────────────

function EditDoctorModal({
  doctor,
  specialities,
  onClose,
  onSaved,
}: {
  doctor: DoctorProfile;
  specialities: Speciality[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<DoctorFormState>(() => fromProfile(doctor));
  const [error, setError] = useState("");
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: UpdateDoctorPayload) =>
      doctorProfilesApi.update(doctor.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-profiles"] });
      onSaved();
    },
    onError: (e: any) => setError(e.response?.data?.error ?? "Failed to save"),
  });

  const handleSubmit = () => {
    setError("");
    if (!form.full_name.trim()) return setError("Full name is required");
    if (!form.speciality_id) return setError("Select a speciality");
    if (!form.qualifications.trim()) return setError("Qualifications are required");
    if (form.role === "assistant_doctor" && !form.supervisor_doctor_id) return setError("Select a supervisor doctor");

    mutation.mutate({
      full_name: form.full_name,
      email: form.email,
      role: form.role,
      is_active: form.is_active,
      speciality_id: form.speciality_id,
      qualifications: form.qualifications,
      bio: form.bio,
      consultation_fee: form.consultation_fee ? parseFloat(form.consultation_fee) : null,
      experience_years: form.experience_years ? parseInt(form.experience_years) : null,
      is_available: form.is_available,
      chamber_ids: form.chamber_ids,
      chamber_schedules: form.chamber_schedules.map((cs) => ({
        chamber_id: cs.chamber_id,
        visit_days: cs.visit_days,
        visit_time_start: cs.visit_time_start || null,
        visit_time_end: cs.visit_time_end || null,
      })),
      supervisor_doctor_id: form.supervisor_doctor_id || null,
    });
  };

  return (
    <DoctorModal
      title={`Edit — ${doctor.full_name}`}
      subtitle={`@${doctor.username}`}
      error={error}
      isPending={mutation.isPending}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Save Changes"
    >
      <DoctorFormFields form={form} setForm={setForm} specialities={specialities} isEdit={true} />
    </DoctorModal>
  );
}

// ── DoctorModal wrapper ────────────────────────────────────────────────────

function DoctorModal({
  title,
  subtitle,
  error,
  isPending,
  onClose,
  onSubmit,
  submitLabel = "Add Doctor",
  children,
}: {
  title: string;
  subtitle?: string;
  error: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: colors.white,
          borderRadius: radius.lg,
          padding: "28px 32px",
          width: 620,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: shadow.lg,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: font.lg, fontWeight: 700, color: colors.text }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ margin: "2px 0 0", fontSize: font.sm, color: colors.textMuted }}>
              {subtitle}
            </p>
          )}
        </div>

        {children}

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: radius.md,
              color: colors.danger,
              fontSize: font.sm,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              background: colors.white,
              cursor: "pointer",
              fontSize: font.base,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isPending}
            style={{
              padding: "8px 20px",
              border: "none",
              borderRadius: radius.md,
              background: colors.primary,
              color: colors.white,
              cursor: isPending ? "default" : "pointer",
              fontSize: font.base,
              fontWeight: 600,
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SpecialityModal ────────────────────────────────────────────────────────

function SpecialityModal({
  existing,
  onClose,
  onSaved,
}: {
  existing: Speciality | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [error, setError] = useState("");
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (p: CreateSpecialityPayload) => specialitiesApi.create(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["specialities"] }); onSaved(); },
    onError: (e: any) => setError(e.response?.data?.error ?? "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: (p: UpdateSpecialityPayload) => specialitiesApi.update(existing!.id, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["specialities"] }); onSaved(); },
    onError: (e: any) => setError(e.response?.data?.error ?? "Failed to save"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    setError("");
    if (!name.trim()) return setError("Name is required");
    if (existing) {
      updateMutation.mutate({ name: name.trim(), description: description.trim() });
    } else {
      createMutation.mutate({ name: name.trim(), description: description.trim() });
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: colors.white,
          borderRadius: radius.lg,
          padding: 28,
          width: 420,
          boxShadow: shadow.lg,
        }}
      >
        <h2 style={{ margin: "0 0 20px", fontSize: font.lg, fontWeight: 700, color: colors.text }}>
          {existing ? "Edit Speciality" : "Add Speciality"}
        </h2>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cardiology"
            style={inputStyle}
            autoFocus
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {error && (
          <p style={{ color: colors.danger, fontSize: font.sm, margin: "0 0 12px" }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              background: colors.white,
              cursor: "pointer",
              fontSize: font.base,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            style={{
              padding: "8px 18px",
              border: "none",
              borderRadius: radius.md,
              background: colors.primary,
              color: colors.white,
              cursor: isPending ? "default" : "pointer",
              fontSize: font.base,
              fontWeight: 600,
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? "Saving…" : existing ? "Save Changes" : "Add Speciality"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Doctors Tab ────────────────────────────────────────────────────────────

function DoctorsTab({ specialities }: { specialities: Speciality[] }) {
  const [filterSpeciality, setFilterSpeciality] = useState("");
  const [filterAvail, setFilterAvail] = useState<"all" | "available" | "unavailable">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<DoctorProfile | null>(null);
  const [addProfileFor, setAddProfileFor] = useState<DoctorProfile | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast, show: showToast, dismiss } = useToast();
  const qc = useQueryClient();

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      doctorProfilesApi.update(id, { is_active }),
    onSuccess: (_, { is_active }) => {
      qc.invalidateQueries({ queryKey: ["doctor-profiles"] });
      showToast(is_active ? "Doctor activated" : "Doctor deactivated", is_active ? "success" : "info");
    },
    onError: () => showToast("Failed to update status", "error"),
  });

  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(v), 300);
  };

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["doctor-profiles", filterSpeciality, filterAvail, debouncedSearch],
    queryFn: () =>
      doctorProfilesApi.list({
        speciality_id: filterSpeciality || undefined,
        is_available:
          filterAvail === "available"
            ? true
            : filterAvail === "unavailable"
            ? false
            : undefined,
        search: debouncedSearch || undefined,
      }),
    staleTime: 0,
  });

  const schedule = (d: DoctorProfile) => {
    const filled = (d.chamber_schedules ?? []).filter(
      (cs) => cs.visit_days.length > 0
    );
    if (filled.length === 0) return "—";
    if (filled.length === 1) {
      const cs = filled[0];
      const days = cs.visit_days.join(", ");
      const time =
        cs.visit_time_start && cs.visit_time_end
          ? ` · ${cs.visit_time_start}–${cs.visit_time_end}`
          : "";
      return `${days}${time}`;
    }
    return `${filled.length} chambers`;
  };

  return (
    <>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

      {showCreate && (
        <CreateDoctorModal
          specialities={specialities}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            showToast("Doctor added successfully", "success");
          }}
        />
      )}
      {addProfileFor && (
        <CreateDoctorModal
          specialities={specialities}
          prefill={addProfileFor}
          onClose={() => setAddProfileFor(null)}
          onCreated={() => {
            setAddProfileFor(null);
            showToast("Doctor profile added successfully", "success");
          }}
        />
      )}
      {editing && (
        <EditDoctorModal
          doctor={editing}
          specialities={specialities}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            showToast("Doctor updated", "success");
          }}
        />
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, qualification…"
          style={{
            ...inputStyle,
            width: 260,
            flex: "none",
          }}
        />
        <select
          value={filterSpeciality}
          onChange={(e) => setFilterSpeciality(e.target.value)}
          style={{ ...inputStyle, width: 200, flex: "none" }}
        >
          <option value="">All Specialities</option>
          {specialities.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={filterAvail}
          onChange={(e) => setFilterAvail(e.target.value as any)}
          style={{ ...inputStyle, width: 160, flex: "none" }}
        >
          <option value="all">All Availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "9px 20px",
            background: colors.primary,
            color: colors.white,
            border: "none",
            borderRadius: radius.md,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: font.base,
            whiteSpace: "nowrap",
          }}
        >
          + Add Doctor
        </button>
      </div>

      {isLoading && <p style={{ color: colors.textMuted }}>Loading…</p>}

      <div
        style={{
          background: colors.white,
          borderRadius: radius.lg,
          boxShadow: shadow.sm,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: colors.bg }}>
              {["Doctor", "Speciality", "Qualifications", "Fee (৳)", "Schedule", "Status", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "11px 16px",
                      textAlign: "left",
                      fontSize: font.sm,
                      fontWeight: 600,
                      color: colors.textMuted,
                      borderBottom: `1px solid ${colors.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {doctors.map((d) => (
              <tr key={d.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                {/* Doctor */}
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: 600, fontSize: font.base, color: colors.text }}>
                    {d.full_name}
                  </div>
                  <div style={{ fontSize: font.sm, color: colors.textMuted }}>
                    @{d.username} ·{" "}
                    <span
                      style={{
                        background: d.role === "doctor" ? "#eff6ff" : "#f5f3ff",
                        color: d.role === "doctor" ? colors.primary : "#7c3aed",
                        padding: "1px 7px",
                        borderRadius: 999,
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      {d.role === "doctor" ? "Doctor" : "Asst. Doctor"}
                    </span>
                  </div>
                </td>

                {/* Speciality */}
                <td style={{ padding: "12px 16px", fontSize: font.sm, color: colors.text, whiteSpace: "nowrap" }}>
                  {d.profile_complete ? d.speciality_name : <span style={{ color: colors.textMuted, fontStyle: "italic" }}>—</span>}
                </td>

                {/* Qualifications */}
                <td style={{ padding: "12px 16px", fontSize: font.sm, color: colors.textMuted, maxWidth: 200 }}>
                  {d.profile_complete ? (
                    <span title={d.qualifications}>
                      {d.qualifications.length > 40 ? d.qualifications.slice(0, 40) + "…" : d.qualifications}
                    </span>
                  ) : <span style={{ fontStyle: "italic" }}>—</span>}
                </td>

                {/* Fee */}
                <td style={{ padding: "12px 16px", fontSize: font.sm, color: colors.text, whiteSpace: "nowrap" }}>
                  {d.profile_complete && d.consultation_fee != null ? `৳${d.consultation_fee.toLocaleString()}` : "—"}
                </td>

                {/* Schedule */}
                <td style={{ padding: "12px 16px", fontSize: font.sm, color: colors.textMuted, whiteSpace: "nowrap" }}>
                  {d.profile_complete ? schedule(d) : "—"}
                </td>

                {/* Status */}
                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: "11px",
                        fontWeight: 600,
                        background: d.is_active ? "#f0fdf4" : "#fef2f2",
                        color: d.is_active ? colors.success : colors.danger,
                        width: "fit-content",
                      }}
                    >
                      {d.is_active ? "Active" : "Inactive"}
                    </span>
                    {d.profile_complete ? (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: "11px",
                          fontWeight: 600,
                          background: d.is_available ? "#f0fdf4" : "#f9fafb",
                          color: d.is_available ? colors.success : colors.textMuted,
                          width: "fit-content",
                        }}
                      >
                        {d.is_available ? "Available" : "Unavailable"}
                      </span>
                    ) : (
                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: "11px", fontWeight: 600, background: "#fef9c3", color: "#92400e", width: "fit-content" }}>
                        Profile Incomplete
                      </span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {d.profile_complete ? (
                      <>
                        <button
                          onClick={() => setEditing(d)}
                          style={{ padding: "4px 14px", background: colors.primaryLight, color: colors.primary, border: `1px solid #bfdbfe`, borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: d.id, is_active: !d.is_active })}
                          disabled={toggleActiveMutation.isPending}
                          style={{ padding: "4px 14px", background: d.is_active ? "#fef2f2" : "#f0fdf4", color: d.is_active ? colors.danger : colors.success, border: `1px solid ${d.is_active ? "#fecaca" : "#bbf7d0"}`, borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}
                        >
                          {d.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setAddProfileFor(d)}
                        style={{ padding: "4px 14px", background: "#fefce8", color: "#92400e", border: `1px solid #fde68a`, borderRadius: radius.sm, cursor: "pointer", fontSize: font.sm, fontWeight: 500 }}
                      >
                        Add Profile
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && doctors.length === 0 && (
          <p style={{ padding: "32px 16px", textAlign: "center", color: colors.textMuted, margin: 0 }}>
            No doctors found.
          </p>
        )}
      </div>
    </>
  );
}

// ── Specialities Tab ───────────────────────────────────────────────────────

function SpecialitiesTab() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Speciality | null>(null);
  const { toast, show: showToast, dismiss } = useToast();
  const qc = useQueryClient();

  const { data: specialities = [], isLoading } = useQuery({
    queryKey: ["specialities", "all"],
    queryFn: () => specialitiesApi.list(false),
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => specialitiesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["specialities"] });
      showToast("Speciality deleted", "info");
    },
    onError: (e: any) =>
      showToast(e.response?.data?.error ?? "Cannot delete speciality", "error"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      specialitiesApi.update(id, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["specialities"] });
      showToast("Speciality updated", "success");
    },
    onError: () => showToast("Failed to update", "error"),
  });

  return (
    <>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

      {(showModal || editing) && (
        <SpecialityModal
          existing={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => {
            setShowModal(false);
            setEditing(null);
            showToast(editing ? "Speciality updated" : "Speciality added", "success");
          }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "9px 20px",
            background: colors.primary,
            color: colors.white,
            border: "none",
            borderRadius: radius.md,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: font.base,
          }}
        >
          + Add Speciality
        </button>
      </div>

      {isLoading && <p style={{ color: colors.textMuted }}>Loading…</p>}

      <div
        style={{
          background: colors.white,
          borderRadius: radius.lg,
          boxShadow: shadow.sm,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: colors.bg }}>
              {["Speciality", "Description", "Doctors", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "11px 16px",
                    textAlign: "left",
                    fontSize: font.sm,
                    fontWeight: 600,
                    color: colors.textMuted,
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {specialities.map((s) => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                <td style={{ padding: "12px 16px", fontWeight: 600, color: colors.text }}>
                  {s.name}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    color: colors.textMuted,
                    fontSize: font.sm,
                    maxWidth: 300,
                  }}
                >
                  {s.description || "—"}
                </td>
                <td style={{ padding: "12px 16px", fontSize: font.sm, color: colors.text }}>
                  <span
                    style={{
                      background: colors.primaryLight,
                      color: colors.primary,
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontWeight: 600,
                      fontSize: font.sm,
                    }}
                  >
                    {s.doctor_count}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: "11px",
                      fontWeight: 600,
                      background: s.is_active ? "#f0fdf4" : "#fef2f2",
                      color: s.is_active ? colors.success : colors.danger,
                    }}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => setEditing(s)}
                      style={{
                        padding: "3px 12px",
                        background: colors.primaryLight,
                        color: colors.primary,
                        border: `1px solid #bfdbfe`,
                        borderRadius: radius.sm,
                        cursor: "pointer",
                        fontSize: font.sm,
                        fontWeight: 500,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        toggleMutation.mutate({ id: s.id, is_active: !s.is_active })
                      }
                      style={{
                        padding: "3px 12px",
                        background: s.is_active ? "#fef3c7" : "#f0fdf4",
                        color: s.is_active ? "#92400e" : colors.success,
                        border: `1px solid ${s.is_active ? "#fde68a" : "#bbf7d0"}`,
                        borderRadius: radius.sm,
                        cursor: "pointer",
                        fontSize: font.sm,
                        fontWeight: 500,
                      }}
                    >
                      {s.is_active ? "Deactivate" : "Activate"}
                    </button>
                    {s.doctor_count === 0 && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${s.name}"?`))
                            deleteMutation.mutate(s.id);
                        }}
                        style={{
                          padding: "3px 12px",
                          background: "#fef2f2",
                          color: colors.danger,
                          border: `1px solid #fecaca`,
                          borderRadius: radius.sm,
                          cursor: "pointer",
                          fontSize: font.sm,
                          fontWeight: 500,
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && specialities.length === 0 && (
          <p style={{ padding: "32px 16px", textAlign: "center", color: colors.textMuted, margin: 0 }}>
            No specialities yet. Add one to get started.
          </p>
        )}
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type Tab = "doctors" | "specialities";

export default function DoctorsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("doctors");

  const { data: specialities = [] } = useQuery({
    queryKey: ["specialities"],
    queryFn: () => specialitiesApi.list(true),
    staleTime: 0,
  });

  const tabStyle = (tab: Tab) => ({
    padding: "10px 24px",
    border: "none",
    borderBottom: `2px solid ${activeTab === tab ? colors.primary : "transparent"}`,
    background: "transparent",
    color: activeTab === tab ? colors.primary : colors.textMuted,
    cursor: "pointer",
    fontSize: font.base,
    fontWeight: activeTab === tab ? 600 : 400,
    transition: "color 0.15s",
  });

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        {/* Page header */}
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>
            Doctors
          </h1>
          <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
            Manage doctor profiles and specialities
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${colors.border}`,
            marginBottom: 24,
          }}
        >
          <button style={tabStyle("doctors")} onClick={() => setActiveTab("doctors")}>
            👨‍⚕️ Doctors
          </button>
          <button style={tabStyle("specialities")} onClick={() => setActiveTab("specialities")}>
            🏷️ Specialities
          </button>
        </div>

        {activeTab === "doctors" && <DoctorsTab specialities={specialities} />}
        {activeTab === "specialities" && <SpecialitiesTab />}
      </div>
    </AppShell>
  );
}

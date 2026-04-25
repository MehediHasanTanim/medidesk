import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import Toast, { useToast } from "@/shared/components/Toast";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  appointmentsApi,
  type AppointmentListItem,
  type BookAppointmentPayload,
  type UpdateAppointmentPayload,
  type WalkInPayload,
} from "@/features/appointments/api/appointmentsApi";
import { consultationsApi, type StartConsultationPayload } from "@/features/consultations/api/consultationsApi";
import { chambersApi } from "@/features/chambers/api/chambersApi";
import { specialitiesApi, doctorProfilesApi, type DoctorProfile } from "@/features/doctors/api/doctorsApi";
import apiClient from "@/shared/lib/apiClient";

const PAGE_LIMIT = 20;

const STATUS_COLORS: Record<string, string> = {
  scheduled: colors.textMuted,
  confirmed: colors.primary,
  in_queue: "#7c3aed",
  in_progress: colors.warning,
  completed: colors.success,
  cancelled: colors.danger,
  no_show: colors.danger,
};

const TERMINAL_STATUSES = ["completed", "cancelled", "no_show"];

// ── StartConsultationModal ─────────────────────────────────────────────────
function StartConsultationModal({
  appointment,
  onClose,
  onStarted,
}: {
  appointment: AppointmentListItem;
  onClose: () => void;
  onStarted: (appointmentId: string) => void;
}) {
  const [chiefComplaints, setChiefComplaints] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (payload: StartConsultationPayload) => consultationsApi.start(payload),
    onSuccess: () => onStarted(appointment.id),
    onError: (e: any) => setError(e.response?.data?.error ?? "Failed to start consultation"),
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.lg, width: "min(500px, 96vw)", padding: 28 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: colors.text }}>
          Start Consultation
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: font.sm, color: colors.textMuted }}>
          Patient: <strong>{appointment.patient_name}</strong> · {appointment.patient_phone}
        </p>
        {error && (
          <div style={{ background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca", borderRadius: radius.md, padding: "10px 14px", marginBottom: 14, fontSize: font.sm }}>
            {error}
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
            Chief Complaints *
          </label>
          <textarea
            autoFocus
            value={chiefComplaints}
            onChange={(e) => setChiefComplaints(e.target.value)}
            rows={4}
            placeholder="Describe the patient's chief complaints…"
            style={{ width: "100%", padding: "8px 12px", border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: font.base, color: colors.text, resize: "vertical", boxSizing: "border-box" as const }}
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
              if (!chiefComplaints.trim()) return setError("Chief complaints are required");
              mutation.mutate({ appointment_id: appointment.id, patient_id: appointment.patient_id, chief_complaints: chiefComplaints });
            }}
            disabled={mutation.isPending}
            style={{ padding: "9px 22px", background: "#d97706", color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600, opacity: mutation.isPending ? 0.7 : 1 }}
          >
            {mutation.isPending ? "Starting…" : "Start Consultation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BookModal ──────────────────────────────────────────────────────────────
function BookModal({
  onClose,
  onBooked,
}: {
  onClose: () => void;
  onBooked: () => void;
}) {
  const { user } = useAuthStore();
  const needsDoctorSelect = !["doctor", "assistant_doctor"].includes(user?.role ?? "");

  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{
    id: string;
    full_name: string;
    patient_id: string;
  } | null>(null);
  const [chamberId, setChamberId] = useState("");   // selected first
  const [specialityId, setSpecialityId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [type, setType] = useState<"new" | "follow_up" | "walk_in">("new");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const { data: patientResults } = useQuery({
    queryKey: ["patient-search-book", patientSearch],
    queryFn: () =>
      apiClient
        .get("/patients/search/", { params: { q: patientSearch } })
        .then((r) => r.data),
    enabled: patientSearch.length > 1,
  });

  // Chambers — loaded immediately
  const { data: chambersData = [] } = useQuery({
    queryKey: ["chambers"],
    queryFn: () => chambersApi.list(),
  });

  // Specialities — for optional filter (non-clinical roles only)
  const { data: specialities = [] } = useQuery({
    queryKey: ["specialities"],
    queryFn: () => specialitiesApi.list(true),
    enabled: needsDoctorSelect,
  });

  // All available doctors — fetched once a chamber is selected
  const { data: allDoctors = [], isFetching: doctorsFetching } = useQuery({
    queryKey: ["doctors-available"],
    queryFn: () => doctorProfilesApi.list({ is_available: true }),
    enabled: needsDoctorSelect && !!chamberId,
    staleTime: 2 * 60_000,
  });

  // Filter to doctors assigned to the selected chamber (+ optional speciality)
  const filteredDoctors: DoctorProfile[] = !chamberId
    ? []
    : allDoctors.filter((d: DoctorProfile) => {
        const inChamber = d.chamber_ids.includes(chamberId);
        const matchesSpec = !specialityId || d.speciality_id === specialityId;
        return inChamber && matchesSpec;
      });

  // Selected doctor object (non-clinical roles)
  const selectedDoctor: DoctorProfile | null = needsDoctorSelect
    ? (filteredDoctors.find((d: DoctorProfile) => d.user_id === doctorId) ?? null)
    : null;

  // Own profile for clinical roles
  const { data: ownDoctorProfile = null } = useQuery<DoctorProfile | null>({
    queryKey: ["own-doctor-profile", user?.id],
    queryFn: () => doctorProfilesApi.getByUserId(user?.id ?? ""),
    enabled: !needsDoctorSelect && !!user?.id,
    staleTime: 5 * 60_000,
  });

  // Doctor whose schedule we display
  const visitDoctor: DoctorProfile | null = needsDoctorSelect ? selectedDoctor : ownDoctorProfile;

  // Schedule for the selected chamber only
  const chamberSchedule = chamberId && visitDoctor
    ? (visitDoctor.chamber_schedules?.find((cs) => cs.chamber_id === chamberId) ?? null)
    : null;

  const qc = useQueryClient();
  const bookMutation = useMutation({
    mutationFn: (payload: BookAppointmentPayload) => appointmentsApi.book(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      onBooked();
    },
    onError: (e: any) => setError(e.response?.data?.error ?? "Booking failed"),
  });

  const handleSubmit = () => {
    setError("");
    if (!selectedPatient) return setError("Select a patient");
    if (!chamberId) return setError("Select a chamber");
    if (!scheduledAt) return setError("Select date & time");
    if (needsDoctorSelect && !doctorId) return setError("Select a doctor");

    // Validate scheduled date/time against doctor's visit schedule for this chamber
    if (chamberSchedule) {
      const scheduledDate = new Date(scheduledAt);
      const DAY_MAP: Record<number, string> = {
        0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat",
      };
      const scheduledDay = DAY_MAP[scheduledDate.getDay()];

      if (
        chamberSchedule.visit_days.length > 0 &&
        !chamberSchedule.visit_days.includes(scheduledDay)
      ) {
        return setError(
          `Doctor does not visit on ${scheduledDay}. Visit days: ${chamberSchedule.visit_days.join(", ")}`
        );
      }

      const toMins = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const fmt12 = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        const period = h < 12 ? "AM" : "PM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:${String(m).padStart(2, "0")} ${period}`;
      };
      const apptMins = scheduledDate.getHours() * 60 + scheduledDate.getMinutes();

      if (chamberSchedule.visit_time_start && apptMins < toMins(chamberSchedule.visit_time_start)) {
        return setError(
          `Appointment time must be at or after ${fmt12(chamberSchedule.visit_time_start)}`
        );
      }
      if (chamberSchedule.visit_time_end && apptMins > toMins(chamberSchedule.visit_time_end)) {
        return setError(
          `Appointment time must be at or before ${fmt12(chamberSchedule.visit_time_end)}`
        );
      }
    }

    const payload: BookAppointmentPayload = {
      patient_id: selectedPatient.id,
      scheduled_at: new Date(scheduledAt).toISOString(),
      appointment_type: type,
      notes,
      chamber_id: chamberId,
    };
    if (needsDoctorSelect) payload.doctor_id = doctorId;
    bookMutation.mutate(payload);
  };

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
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
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
          width: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: shadow.lg,
        }}
      >
        <h2
          style={{
            margin: "0 0 20px",
            fontSize: font.lg,
            fontWeight: 700,
            color: colors.text,
          }}
        >
          Book Appointment
        </h2>

        {/* Patient */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Patient</label>
          {selectedPatient ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                border: `1px solid ${colors.primary}`,
                borderRadius: radius.md,
                background: colors.primaryLight,
              }}
            >
              <span style={{ fontWeight: 500, color: colors.text }}>
                {selectedPatient.full_name}{" "}
                <span style={{ color: colors.textMuted, fontSize: font.sm }}>
                  #{selectedPatient.patient_id}
                </span>
              </span>
              <button
                onClick={() => setSelectedPatient(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: colors.textMuted,
                  cursor: "pointer",
                  fontSize: font.sm,
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <input
                placeholder="Search by name or phone…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                style={inputStyle}
              />
              {(patientResults?.results?.length ?? 0) > 0 && (
                <div
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.md,
                    marginTop: 4,
                    maxHeight: 180,
                    overflowY: "auto",
                    background: colors.white,
                  }}
                >
                  {patientResults.results.map((p: any) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setPatientSearch("");
                      }}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: `1px solid ${colors.borderLight}`,
                        fontSize: font.base,
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background = colors.bg)
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.background = colors.white)
                      }
                    >
                      {p.full_name}{" "}
                      <span style={{ color: colors.textMuted, fontSize: font.sm }}>
                        #{p.patient_id} · {p.phone}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Chamber — selected first (required) */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Chamber</label>
          <select
            value={chamberId}
            onChange={(e) => {
              setChamberId(e.target.value);
              setDoctorId(""); // reset doctor when chamber changes
            }}
            style={inputStyle}
          >
            <option value="">Select chamber…</option>
            {chambersData.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Speciality (optional filter) → Doctor — only for non-clinical staff */}
        {needsDoctorSelect && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Speciality (optional)</label>
              <select
                value={specialityId}
                onChange={(e) => {
                  setSpecialityId(e.target.value);
                  setDoctorId("");
                }}
                disabled={!chamberId}
                style={{
                  ...inputStyle,
                  background: !chamberId ? colors.bg : colors.white,
                  color: !chamberId ? colors.textMuted : colors.text,
                }}
              >
                <option value="">All specialities</option>
                {specialities.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Doctor</label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                disabled={!chamberId || doctorsFetching}
                style={{
                  ...inputStyle,
                  background: !chamberId ? colors.bg : colors.white,
                  color: !chamberId ? colors.textMuted : colors.text,
                }}
              >
                <option value="">
                  {!chamberId
                    ? "Select a chamber first…"
                    : doctorsFetching
                    ? "Loading…"
                    : filteredDoctors.length === 0
                    ? "No available doctors in this chamber"
                    : "Select doctor…"}
                </option>
                {filteredDoctors.map((d: DoctorProfile) => (
                  <option key={d.user_id} value={d.user_id}>
                    {d.full_name} · {d.role === "assistant_doctor" ? "Asst. Doctor" : "Doctor"}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Visit Schedule — shows only the schedule for the selected chamber */}
        {chamberSchedule && chamberSchedule.visit_days.length > 0 && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: radius.md,
            }}
          >
            <div
              style={{
                fontSize: font.sm,
                fontWeight: 600,
                color: "#0369a1",
                marginBottom: 8,
              }}
            >
              📅 Visit Schedule
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              {chamberSchedule.visit_days.map((day) => (
                <span
                  key={day}
                  style={{
                    padding: "2px 9px",
                    background: "#dbeafe",
                    color: "#1d4ed8",
                    borderRadius: radius.sm,
                    fontSize: font.sm,
                    fontWeight: 600,
                  }}
                >
                  {day}
                </span>
              ))}
              {chamberSchedule.visit_time_start && (
                <span style={{ fontSize: font.sm, color: "#0369a1", marginLeft: 4 }}>
                  ⏰ {chamberSchedule.visit_time_start}
                  {chamberSchedule.visit_time_end ? ` – ${chamberSchedule.visit_time_end}` : ""}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Date & Time */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Date &amp; Time</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Type */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Type</label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["new", "follow_up", "walk_in"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  border: `1px solid ${type === t ? colors.primary : colors.border}`,
                  borderRadius: radius.md,
                  background: type === t ? colors.primaryLight : colors.white,
                  color: type === t ? colors.primary : colors.textMuted,
                  cursor: "pointer",
                  fontSize: font.sm,
                  fontWeight: 500,
                  textTransform: "capitalize",
                }}
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{
              ...inputStyle,
              resize: "vertical",
            }}
          />
        </div>

        {error && (
          <p
            style={{
              color: colors.danger,
              fontSize: font.sm,
              margin: "0 0 12px",
            }}
          >
            {error}
          </p>
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
            disabled={bookMutation.isPending}
            style={{
              padding: "8px 18px",
              border: "none",
              borderRadius: radius.md,
              background: colors.primary,
              color: colors.white,
              cursor: "pointer",
              fontSize: font.base,
              fontWeight: 600,
              opacity: bookMutation.isPending ? 0.7 : 1,
            }}
          >
            {bookMutation.isPending ? "Booking…" : "Book"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EditModal ──────────────────────────────────────────────────────────────
function EditModal({
  appointment,
  onClose,
  onSaved,
}: {
  appointment: AppointmentListItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuthStore();
  const canChangeDr = !["doctor", "assistant_doctor"].includes(user?.role ?? "");

  // Pre-fill from existing appointment
  const toLocalDt = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [doctorId, setDoctorId] = useState(appointment.doctor_id);
  const [specialityId, setSpecialityId] = useState("");
  const [chamberId, setChamberId] = useState(appointment.chamber_id ?? "");
  const [scheduledAt, setScheduledAt] = useState(toLocalDt(appointment.scheduled_at));
  const [type, setType] = useState<"new" | "follow_up" | "walk_in">(
    appointment.appointment_type as "new" | "follow_up" | "walk_in"
  );
  const [notes, setNotes] = useState(appointment.notes);
  const [error, setError] = useState("");

  const { data: specialities = [] } = useQuery({
    queryKey: ["specialities"],
    queryFn: () => specialitiesApi.list(true),
    enabled: canChangeDr,
    staleTime: 0,
  });

  const { data: doctors = [], isFetching: doctorsFetching } = useQuery({
    queryKey: ["doctors-by-speciality", specialityId],
    queryFn: () => doctorProfilesApi.list({ speciality_id: specialityId, is_available: true }),
    enabled: canChangeDr && !!specialityId,
    staleTime: 0,
  });

  const { data: chambersData } = useQuery({
    queryKey: ["chambers"],
    queryFn: () => chambersApi.list(),
  });

  const qc = useQueryClient();
  const editMutation = useMutation({
    mutationFn: (payload: UpdateAppointmentPayload) =>
      appointmentsApi.update(appointment.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      onSaved();
    },
    onError: (e: any) =>
      setError(e.response?.data?.error ?? "Failed to save changes"),
  });

  const handleSubmit = () => {
    setError("");
    if (!scheduledAt) return setError("Select date & time");

    const payload: UpdateAppointmentPayload = {
      scheduled_at: new Date(scheduledAt).toISOString(),
      appointment_type: type,
      chamber_id: chamberId || null,
      notes,
    };
    if (canChangeDr) payload.doctor_id = doctorId;
    editMutation.mutate(payload);
  };

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
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
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
          width: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: shadow.lg,
        }}
      >
        <h2
          style={{
            margin: "0 0 4px",
            fontSize: font.lg,
            fontWeight: 700,
            color: colors.text,
          }}
        >
          Edit Appointment
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: font.sm, color: colors.textMuted }}>
          Patient: <strong>{appointment.patient_name}</strong> · {appointment.patient_phone}
        </p>

        {/* Speciality → Doctor cascade — only for non-clinical staff */}
        {canChangeDr && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Speciality</label>
              <select
                value={specialityId}
                onChange={(e) => {
                  setSpecialityId(e.target.value);
                  setDoctorId("");
                }}
                style={inputStyle}
              >
                <option value="">Select speciality…</option>
                {specialities.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Doctor</label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                disabled={!specialityId || doctorsFetching}
                style={{
                  ...inputStyle,
                  background: !specialityId ? colors.bg : colors.white,
                  color: !specialityId ? colors.textMuted : colors.text,
                }}
              >
                <option value="">
                  {!specialityId
                    ? "Select a speciality first…"
                    : doctorsFetching
                    ? "Loading…"
                    : doctors.length === 0
                    ? "No available doctors"
                    : "Select doctor…"}
                </option>
                {doctors.map((d: DoctorProfile) => (
                  <option key={d.user_id} value={d.user_id}>
                    {d.full_name} · {d.role === "assistant_doctor" ? "Asst. Doctor" : "Doctor"}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Chamber */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Chamber</label>
          <select
            value={chamberId}
            onChange={(e) => setChamberId(e.target.value)}
            style={inputStyle}
          >
            <option value="">No chamber</option>
            {chambersData?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date & Time */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Date &amp; Time</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Type */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Type</label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["new", "follow_up", "walk_in"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  border: `1px solid ${type === t ? colors.primary : colors.border}`,
                  borderRadius: radius.md,
                  background: type === t ? colors.primaryLight : colors.white,
                  color: type === t ? colors.primary : colors.textMuted,
                  cursor: "pointer",
                  fontSize: font.sm,
                  fontWeight: 500,
                  textTransform: "capitalize",
                }}
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {error && (
          <p style={{ color: colors.danger, fontSize: font.sm, margin: "0 0 12px" }}>
            {error}
          </p>
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
            disabled={editMutation.isPending}
            style={{
              padding: "8px 18px",
              border: "none",
              borderRadius: radius.md,
              background: colors.primary,
              color: colors.white,
              cursor: "pointer",
              fontSize: font.base,
              fontWeight: 600,
              opacity: editMutation.isPending ? 0.7 : 1,
            }}
          >
            {editMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── WalkInModal ────────────────────────────────────────────────────────────
function WalkInModal({
  onClose,
  onBooked,
}: {
  onClose: () => void;
  onBooked: (tokenNumber: number) => void;
}) {
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; full_name: string } | null>(null);
  const [chamberId, setChamberId] = useState("");
  const [specialityId, setSpecialityId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const { data: patientResults } = useQuery({
    queryKey: ["patient-search-walkin", patientSearch],
    queryFn: () =>
      apiClient.get("/patients/search/", { params: { q: patientSearch } }).then((r) => r.data),
    enabled: patientSearch.length > 1,
  });

  const { data: chambersData = [] } = useQuery({
    queryKey: ["chambers"],
    queryFn: () => chambersApi.list(),
  });

  const { data: specialities = [] } = useQuery({
    queryKey: ["specialities"],
    queryFn: () => specialitiesApi.list(true),
  });

  const { data: allDoctors = [], isFetching: doctorsFetching } = useQuery({
    queryKey: ["doctors-available"],
    queryFn: () => doctorProfilesApi.list({ is_available: true }),
    enabled: !!chamberId,
    staleTime: 2 * 60_000,
  });

  const filteredDoctors: DoctorProfile[] = !chamberId
    ? []
    : allDoctors.filter((d: DoctorProfile) => {
        const inChamber = d.chamber_ids.includes(chamberId);
        const matchesSpec = !specialityId || d.speciality_id === specialityId;
        return inChamber && matchesSpec;
      });

  const qc = useQueryClient();
  const walkInMutation = useMutation({
    mutationFn: (payload: WalkInPayload) => appointmentsApi.walkIn(payload),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["queue"] });
      onBooked(result.token_number ?? 0);
    },
    onError: (e: any) => setError(e.response?.data?.error ?? "Walk-in failed"),
  });

  const handleSubmit = () => {
    setError("");
    if (!selectedPatient) return setError("Select a patient");
    if (!chamberId) return setError("Select a chamber");
    if (!doctorId) return setError("Select a doctor");
    walkInMutation.mutate({
      patient_id: selectedPatient.id,
      doctor_id: doctorId,
      chamber_id: chamberId,
      notes,
    });
  };

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
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: colors.white, borderRadius: radius.lg, padding: 28, width: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: shadow.lg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ background: "#7c3aed", color: "#fff", borderRadius: radius.md, padding: "2px 10px", fontSize: font.sm, fontWeight: 700, letterSpacing: "0.04em" }}>
            WALK-IN
          </span>
          <h2 style={{ margin: 0, fontSize: font.lg, fontWeight: 700, color: colors.text }}>
            Register Walk-in Patient
          </h2>
        </div>
        <p style={{ margin: "0 0 20px", fontSize: font.sm, color: colors.textMuted }}>
          Patient will be added to today's queue immediately with the next available token.
        </p>

        {error && (
          <div style={{ background: "#fef2f2", color: colors.danger, border: `1px solid #fecaca`, borderRadius: radius.md, padding: "10px 14px", marginBottom: 14, fontSize: font.sm }}>
            {error}
          </div>
        )}

        {/* Patient search */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Patient</label>
          {selectedPatient ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: `1px solid ${colors.primary}`, borderRadius: radius.md, background: colors.primaryLight }}>
              <span style={{ flex: 1, fontSize: font.base, color: colors.text, fontWeight: 500 }}>{selectedPatient.full_name}</span>
              <button onClick={() => setSelectedPatient(null)} style={{ background: "none", border: "none", cursor: "pointer", color: colors.textMuted, fontSize: font.sm }}>✕</button>
            </div>
          ) : (
            <>
              <input
                autoFocus
                placeholder="Search by name or phone…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                style={inputStyle}
              />
              {patientResults?.results?.length > 0 && (
                <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.md, marginTop: 4, background: colors.white, boxShadow: shadow.md, maxHeight: 180, overflowY: "auto" }}>
                  {patientResults.results.map((p: any) => (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedPatient({ id: p.id, full_name: p.full_name }); setPatientSearch(""); }}
                      style={{ padding: "8px 12px", cursor: "pointer", fontSize: font.base, borderBottom: `1px solid ${colors.border}` }}
                    >
                      <strong>{p.full_name}</strong> · {p.phone}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Chamber */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Chamber</label>
          <select value={chamberId} onChange={(e) => { setChamberId(e.target.value); setDoctorId(""); }} style={inputStyle}>
            <option value="">Select chamber…</option>
            {chambersData?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Speciality filter */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Speciality (optional filter)</label>
          <select value={specialityId} onChange={(e) => { setSpecialityId(e.target.value); setDoctorId(""); }} style={inputStyle}>
            <option value="">All specialities</option>
            {specialities.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Doctor */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Doctor</label>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            disabled={!chamberId || doctorsFetching}
            style={{ ...inputStyle, background: !chamberId ? colors.bg : colors.white, color: !chamberId ? colors.textMuted : colors.text }}
          >
            <option value="">
              {!chamberId ? "Select a chamber first…" : doctorsFetching ? "Loading…" : filteredDoctors.length === 0 ? "No available doctors" : "Select doctor…"}
            </option>
            {filteredDoctors.map((d: DoctorProfile) => (
              <option key={d.user_id} value={d.user_id}>{d.full_name}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Chief complaints or any notes…"
            style={{ ...inputStyle, resize: "vertical" as const }}
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
            onClick={handleSubmit}
            disabled={walkInMutation.isPending}
            style={{ padding: "9px 22px", background: "#7c3aed", color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600, opacity: walkInMutation.isPending ? 0.7 : 1 }}
          >
            {walkInMutation.isPending ? "Adding…" : "Add to Queue"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentListItem | null>(null);
  const [startingAppt, setStartingAppt] = useState<AppointmentListItem | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [offset, setOffset] = useState(0);
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { toast, show: showToast, dismiss } = useToast();

  const canCheckIn = ["receptionist", "assistant", "admin", "super_admin"].includes(
    user?.role ?? ""
  );
  const isClinical = ["doctor", "assistant_doctor"].includes(user?.role ?? "");
  const canWalkIn = ["receptionist", "assistant"].includes(user?.role ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", selectedDate, offset],
    queryFn: () =>
      appointmentsApi.list({ date: selectedDate, limit: PAGE_LIMIT, offset }),
    refetchInterval: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      const labels: Record<string, string> = {
        confirmed: "Appointment confirmed",
        cancelled: "Appointment cancelled",
        no_show: "Marked as no-show",
        in_progress: "Consultation started",
        completed: "Appointment completed",
      };
      showToast(labels[status] ?? "Status updated", status === "cancelled" || status === "no_show" ? "error" : "success");
    },
    onError: () => showToast("Failed to update status", "error"),
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.checkIn(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      showToast("Patient checked in", "success");
    },
    onError: () => showToast("Check-in failed", "error"),
  });

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_LIMIT);
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

  return (
    <AppShell>
      <Toast
        message={toast?.message ?? null}
        type={toast?.type}
        onDismiss={dismiss}
      />
      {showModal && (
        <BookModal
          onClose={() => setShowModal(false)}
          onBooked={() => {
            setShowModal(false);
            showToast("Appointment booked successfully", "success");
          }}
        />
      )}
      {showWalkInModal && (
        <WalkInModal
          onClose={() => setShowWalkInModal(false)}
          onBooked={(token) => {
            setShowWalkInModal(false);
            showToast(`Walk-in registered — Token #${token}`, "success");
          }}
        />
      )}
      {startingAppt && (
        <StartConsultationModal
          appointment={startingAppt}
          onClose={() => setStartingAppt(null)}
          onStarted={(appointmentId) => {
            setStartingAppt(null);
            navigate(`/consultations/${appointmentId}`);
          }}
        />
      )}
      {editingAppointment && (
        <EditModal
          appointment={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSaved={() => {
            setEditingAppointment(null);
            showToast("Appointment updated", "success");
          }}
        />
      )}

      <div style={{ padding: "32px 40px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: font.xl,
                fontWeight: 700,
                color: colors.text,
              }}
            >
              Appointments
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                color: colors.textMuted,
                fontSize: font.base,
              }}
            >
              {data?.count ?? 0} appointment{data?.count !== 1 ? "s" : ""} on{" "}
              {selectedDate}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setOffset(0);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: font.base,
                background: colors.white,
              }}
            />
            {canWalkIn && (
              <button
                onClick={() => setShowWalkInModal(true)}
                style={{
                  padding: "9px 20px",
                  background: "#7c3aed",
                  color: colors.white,
                  border: "none",
                  borderRadius: radius.md,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: font.base,
                }}
              >
                Walk In
              </button>
            )}
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
              + Book
            </button>
          </div>
        </div>

        {isLoading && (
          <p style={{ color: colors.textMuted }}>Loading…</p>
        )}

        {/* Table */}
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
                {["Token", "Time", "Patient", "Doctor", "Type", "Status", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
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
              {data?.results?.map((item: AppointmentListItem) => (
                <tr
                  key={item.id}
                  style={{ borderBottom: `1px solid ${colors.borderLight}` }}
                >
                  {/* Token */}
                  <td
                    style={{
                      padding: "12px 16px",
                      fontWeight: 700,
                      color: colors.primary,
                      fontSize: font.base,
                    }}
                  >
                    {item.token_number != null ? `#${item.token_number}` : "—"}
                  </td>

                  {/* Time */}
                  <td
                    style={{
                      padding: "12px 16px",
                      color: colors.text,
                      fontSize: font.base,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(item.scheduled_at).toLocaleTimeString("en-BD", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>

                  {/* Patient */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 500, color: colors.text, fontSize: font.base }}>
                      {item.patient_name}
                    </div>
                    <div style={{ color: colors.textMuted, fontSize: font.sm }}>
                      {item.patient_phone}
                    </div>
                  </td>

                  {/* Doctor */}
                  <td
                    style={{
                      padding: "12px 16px",
                      color: colors.text,
                      fontSize: font.sm,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.doctor_name}
                  </td>

                  {/* Type */}
                  <td
                    style={{
                      padding: "12px 16px",
                      color: colors.textMuted,
                      fontSize: font.sm,
                      textTransform: "capitalize",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.appointment_type.replace("_", " ")}
                  </td>

                  {/* Status */}
                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        color: STATUS_COLORS[item.status] ?? colors.textMuted,
                        fontWeight: 600,
                        fontSize: font.sm,
                        textTransform: "capitalize",
                      }}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {/* Edit — scheduled or confirmed only */}
                      {["scheduled", "confirmed"].includes(item.status) && (
                        <button
                          onClick={() => setEditingAppointment(item)}
                          style={{
                            padding: "3px 10px",
                            background: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                            borderRadius: radius.sm,
                            cursor: "pointer",
                            fontSize: font.sm,
                            fontWeight: 500,
                          }}
                        >
                          ✏ Edit
                        </button>
                      )}

                      {/* Check In — receptionist/assistant when scheduled */}
                      {item.status === "scheduled" && canCheckIn && (
                        <button
                          onClick={() => checkInMutation.mutate(item.id)}
                          disabled={checkInMutation.isPending}
                          style={{
                            padding: "3px 10px",
                            background: "#7c3aed",
                            color: colors.white,
                            border: "none",
                            borderRadius: radius.sm,
                            cursor: "pointer",
                            fontSize: font.sm,
                            fontWeight: 500,
                          }}
                        >
                          Check In
                        </button>
                      )}

                      {/* Confirm — scheduled only */}
                      {item.status === "scheduled" && (
                        <button
                          onClick={() =>
                            statusMutation.mutate({ id: item.id, status: "confirmed" })
                          }
                          style={{
                            padding: "3px 10px",
                            background: colors.primaryLight,
                            color: colors.primary,
                            border: `1px solid #bfdbfe`,
                            borderRadius: radius.sm,
                            cursor: "pointer",
                            fontSize: font.sm,
                            fontWeight: 500,
                          }}
                        >
                          Confirm
                        </button>
                      )}

                      {/* Start — opens StartConsultationModal for clinical staff */}
                      {["confirmed", "in_queue"].includes(item.status) && isClinical && (
                        <button
                          onClick={() => setStartingAppt(item)}
                          style={{
                            padding: "3px 10px",
                            background: "#fef3c7",
                            color: "#92400e",
                            border: `1px solid #fde68a`,
                            borderRadius: radius.sm,
                            cursor: "pointer",
                            fontSize: font.sm,
                            fontWeight: 500,
                          }}
                        >
                          Start
                        </button>
                      )}

                      {/* Open — navigate to consultation page for in_progress items */}
                      {item.status === "in_progress" && isClinical && (
                        <button
                          onClick={() => navigate(`/consultations/${item.id}`)}
                          style={{
                            padding: "3px 10px",
                            background: "#eff6ff",
                            color: colors.primary,
                            border: `1px solid #bfdbfe`,
                            borderRadius: radius.sm,
                            cursor: "pointer",
                            fontSize: font.sm,
                            fontWeight: 500,
                          }}
                        >
                          Open
                        </button>
                      )}

                      {/* Complete — in_progress for clinical staff */}
                      {item.status === "in_progress" && isClinical && (
                        <button
                          onClick={() =>
                            statusMutation.mutate({ id: item.id, status: "completed" })
                          }
                          style={{
                            padding: "3px 10px",
                            background: "#f0fdf4",
                            color: "#166534",
                            border: `1px solid #bbf7d0`,
                            borderRadius: radius.sm,
                            cursor: "pointer",
                            fontSize: font.sm,
                            fontWeight: 500,
                          }}
                        >
                          Complete
                        </button>
                      )}

                      {/* No Show — scheduled/confirmed */}
                      {["scheduled", "confirmed"].includes(item.status) && (
                        <button
                          onClick={() =>
                            statusMutation.mutate({ id: item.id, status: "no_show" })
                          }
                          style={{
                            padding: "3px 10px",
                            background: "#f9fafb",
                            color: colors.textMuted,
                            border: `1px solid ${colors.border}`,
                            borderRadius: radius.sm,
                            cursor: "pointer",
                            fontSize: font.sm,
                            fontWeight: 500,
                          }}
                        >
                          No Show
                        </button>
                      )}

                      {/* Cancel — any non-terminal status */}
                      {!TERMINAL_STATUSES.includes(item.status) && (
                        <button
                          onClick={() =>
                            statusMutation.mutate({ id: item.id, status: "cancelled" })
                          }
                          style={{
                            padding: "3px 10px",
                            background: colors.dangerLight,
                            color: colors.danger,
                            border: `1px solid #fecaca`,
                            borderRadius: radius.sm,
                            cursor: "pointer",
                            fontSize: font.sm,
                            fontWeight: 500,
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!isLoading && (data?.results?.length ?? 0) === 0 && (
            <p
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: colors.textMuted,
                margin: 0,
              }}
            >
              No appointments for this date.
            </p>
          )}
        </div>

        {/* Pagination */}
        {(data?.count ?? 0) > PAGE_LIMIT && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              marginTop: 20,
            }}
          >
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}
              disabled={offset === 0}
              style={{
                padding: "6px 16px",
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                background: colors.white,
                cursor: offset === 0 ? "default" : "pointer",
                opacity: offset === 0 ? 0.4 : 1,
                fontSize: font.sm,
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: font.sm, color: colors.textMuted }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + PAGE_LIMIT)}
              disabled={offset + PAGE_LIMIT >= (data?.count ?? 0)}
              style={{
                padding: "6px 16px",
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                background: colors.white,
                cursor:
                  offset + PAGE_LIMIT >= (data?.count ?? 0) ? "default" : "pointer",
                opacity: offset + PAGE_LIMIT >= (data?.count ?? 0) ? 0.4 : 1,
                fontSize: font.sm,
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import Toast, { useToast } from "@/shared/components/Toast";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  appointmentsApi,
  type AppointmentListItem,
  type BookAppointmentPayload,
} from "@/features/appointments/api/appointmentsApi";
import { usersApi, type DoctorOption } from "@/features/users/api/usersApi";
import { chambersApi } from "@/features/chambers/api/chambersApi";
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
  const [doctorId, setDoctorId] = useState("");
  const [chamberId, setChamberId] = useState("");
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

  const { data: doctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: usersApi.doctors,
    enabled: needsDoctorSelect,
  });

  const { data: chambersData } = useQuery({
    queryKey: ["chambers"],
    queryFn: () => chambersApi.list(),
  });

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
    if (!scheduledAt) return setError("Select date & time");
    if (needsDoctorSelect && !doctorId) return setError("Select a doctor");

    const payload: BookAppointmentPayload = {
      patient_id: selectedPatient.id,
      scheduled_at: new Date(scheduledAt).toISOString(),
      appointment_type: type,
      notes,
    };
    if (needsDoctorSelect) payload.doctor_id = doctorId;
    if (chamberId) payload.chamber_id = chamberId;
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

        {/* Doctor — only for non-clinical staff */}
        {needsDoctorSelect && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select doctor…</option>
              {doctors?.map((d: DoctorOption) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} (
                  {d.role === "assistant_doctor" ? "Asst. Doctor" : "Doctor"})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Chamber (optional) */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Chamber (optional)</label>
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

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const [showModal, setShowModal] = useState(false);
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

                      {/* Start — confirmed / in_queue for clinical staff */}
                      {["confirmed", "in_queue"].includes(item.status) && isClinical && (
                        <button
                          onClick={() =>
                            statusMutation.mutate({ id: item.id, status: "in_progress" })
                          }
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

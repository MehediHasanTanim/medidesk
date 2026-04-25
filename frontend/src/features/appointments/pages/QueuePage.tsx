import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import Toast, { useToast } from "@/shared/components/Toast";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { useAuthStore } from "@/features/auth/store/authStore";
import { appointmentsApi, type QueueItem, type AppointmentListItem } from "@/features/appointments/api/appointmentsApi";
import { useQueueSSE } from "@/features/appointments/hooks/useQueueSSE";
import {
  consultationsApi,
  type StartConsultationPayload,
} from "@/features/consultations/api/consultationsApi";

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  in_progress: { bg: "#059669", color: "#fff" },
  in_queue:    { bg: colors.primary, color: "#fff" },
  confirmed:   { bg: "#d97706", color: "#fff" },
  completed:   { bg: "#6b7280", color: "#fff" },
  cancelled:   { bg: "#dc2626", color: "#fff" },
  no_show:     { bg: "#9ca3af", color: "#fff" },
};

// ── Start Consultation Modal ──────────────────────────────────────────────────

function StartConsultationModal({
  item,
  onClose,
  onStarted,
}: {
  item: QueueItem;
  onClose: () => void;
  onStarted: (appointmentId: string) => void;
}) {
  const [chiefComplaints, setChiefComplaints] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (payload: StartConsultationPayload) =>
      consultationsApi.start(payload),
    onSuccess: () => onStarted(item.id),
    onError: (e: any) =>
      setError(e.response?.data?.error ?? "Failed to start consultation"),
  });

  const handleSubmit = () => {
    setError("");
    if (!chiefComplaints.trim()) return setError("Chief complaints are required");
    mutation.mutate({
      appointment_id: item.id,
      patient_id: item.patient_id,
      chief_complaints: chiefComplaints,
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: colors.white, borderRadius: radius.lg, boxShadow: shadow.lg,
        width: "min(500px, 96vw)", padding: 28,
      }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: colors.text }}>
          Start Consultation
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: font.sm, color: colors.textMuted }}>
          Patient: <strong>{item.patient_name}</strong> · #{item.token_number}
        </p>

        {error && (
          <div style={{ background: "#fef2f2", color: colors.danger, border: "1px solid #fecaca", borderRadius: radius.md, padding: "10px 14px", marginBottom: 14, fontSize: font.sm }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Chief Complaints *
          </label>
          <textarea
            autoFocus
            value={chiefComplaints}
            onChange={(e) => setChiefComplaints(e.target.value)}
            rows={4}
            placeholder="Describe the patient's chief complaints…"
            style={{
              width: "100%", padding: "8px 12px",
              border: `1px solid ${colors.border}`, borderRadius: radius.md,
              fontSize: font.base, color: colors.text, resize: "vertical",
              fontFamily: font.family, boxSizing: "border-box",
            }}
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
            disabled={mutation.isPending}
            style={{ padding: "9px 22px", background: "#d97706", color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontSize: font.base, fontWeight: 600 }}
          >
            {mutation.isPending ? "Starting…" : "Start Consultation"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const today = new Date().toISOString().split("T")[0];
  const { user } = useAuthStore();
  const isClinical = ["doctor", "assistant_doctor"].includes(user?.role ?? "");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast, dismiss } = useToast();
  const [startingItem, setStartingItem] = useState<QueueItem | null>(null);

  // Active queue — live via SSE, falls back to 10 s polling automatically
  const { data, sseStatus, refetch: refetchQueue } = useQueueSSE(
    today,
    undefined,
    () => appointmentsApi.getQueue(today),
  );
  const isLoading = data === null;

  // Completed today — polling is fine (less time-critical)
  const { data: completedData, refetch: refetchCompleted } = useQuery({
    queryKey: ["queue-completed", today],
    queryFn: () => appointmentsApi.list({ date: today, status: "completed", limit: 100 }),
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const completedItems: AppointmentListItem[] = completedData?.results ?? [];

  const handleStarted = (appointmentId: string) => {
    setStartingItem(null);
    qc.invalidateQueries({ queryKey: ["queue-completed", today] });
    navigate(`/consultations/${appointmentId}`);
  };

  const handleRefresh = () => {
    refetchQueue();
    refetchCompleted();
  };

  return (
    <AppShell>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

      {startingItem && (
        <StartConsultationModal
          item={startingItem}
          onClose={() => setStartingItem(null)}
          onStarted={handleStarted}
        />
      )}

      <div style={{ padding: "32px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>
                Live Queue — {today}
              </h1>
              {sseStatus === "live" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#dcfce7", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 999, padding: "2px 10px", fontSize: font.sm, fontWeight: 600 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a", display: "inline-block", animation: "pulse 2s infinite" }} />
                  Live
                </span>
              )}
              {sseStatus === "connecting" && (
                <span style={{ color: colors.textMuted, fontSize: font.sm }}>Connecting…</span>
              )}
              {sseStatus === "polling" && (
                <span style={{ color: colors.textMuted, fontSize: font.sm }}>↻ Polling</span>
              )}
            </div>
            <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
              {data?.total ?? 0} patient{data?.total !== 1 ? "s" : ""} in queue
            </p>
          </div>
          <button
            onClick={handleRefresh}
            style={{ padding: "9px 20px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontWeight: 600, fontSize: font.base }}
          >
            Refresh
          </button>
        </div>

        {isLoading && <p style={{ color: colors.textMuted }}>Loading queue…</p>}

        {/* ── Now Serving banner ── */}
        {data?.now_serving != null && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: radius.lg, padding: "12px 20px", marginBottom: 12,
          }}>
            <span style={{ fontSize: 20 }}>🩺</span>
            <span style={{ fontWeight: 700, color: "#15803d", fontSize: font.base }}>
              Now Serving — Token #{data.now_serving}
            </span>
          </div>
        )}

        {/* ── Active queue ── */}
        <div style={{ display: "grid", gap: 12 }}>
          {data?.queue?.map((item: QueueItem) => {
            const ss = STATUS_STYLES[item.status];
            const isNowServing = item.status === "in_progress";

            // ETA label
            let etaLabel: string;
            if (isNowServing) {
              etaLabel = "Now serving";
            } else if (item.estimated_wait_minutes === 0) {
              etaLabel = "Next up · ~0 min";
            } else {
              etaLabel = `Queue #${item.queue_position} · ~${item.estimated_wait_minutes} min wait`;
            }

            return (
              <div
                key={item.id}
                style={{
                  background: isNowServing ? "#f0fdf4" : colors.white,
                  border: `1px solid ${isNowServing ? "#86efac" : colors.border}`,
                  borderRadius: radius.lg,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  boxShadow: isNowServing ? "0 0 0 2px #bbf7d0" : shadow.sm,
                }}
              >
                {/* Token number */}
                <div style={{
                  fontSize: 36, fontWeight: 700,
                  color: isNowServing ? "#15803d" : colors.primary,
                  minWidth: 60, textAlign: "center",
                }}>
                  #{item.token_number}
                </div>

                {/* Patient info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: font.base, color: colors.text }}>
                    {item.patient_name}
                  </div>
                  <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
                    {item.patient_phone} · {item.appointment_type.replace(/_/g, " ")} ·{" "}
                    {new Date(item.scheduled_at).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {/* ETA / position chip */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    marginTop: 5,
                    background: isNowServing ? "#dcfce7" : "#f0f9ff",
                    color: isNowServing ? "#15803d" : "#0369a1",
                    border: `1px solid ${isNowServing ? "#bbf7d0" : "#bae6fd"}`,
                    borderRadius: 999, padding: "2px 10px",
                    fontSize: "11px", fontWeight: 600,
                  }}>
                    {isNowServing ? "🟢" : "⏱"} {etaLabel}
                  </div>
                  {item.notes && (
                    <div style={{ color: colors.textMuted, fontSize: font.sm, fontStyle: "italic", marginTop: 4 }}>
                      {item.notes}
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <span style={{ background: ss?.bg ?? colors.textMuted, color: ss?.color ?? "#fff", padding: "4px 12px", borderRadius: 999, fontSize: font.sm, fontWeight: 500, whiteSpace: "nowrap" }}>
                  {item.status.replace(/_/g, " ")}
                </span>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {isClinical && ["confirmed", "in_queue"].includes(item.status) && (
                    <button
                      onClick={() => setStartingItem(item)}
                      style={{
                        padding: "5px 14px",
                        background: "#fef3c7", color: "#92400e",
                        border: "1px solid #fde68a",
                        borderRadius: radius.md, cursor: "pointer",
                        fontSize: font.sm, fontWeight: 600,
                      }}
                    >
                      Start
                    </button>
                  )}
                  {item.status === "in_progress" && (
                    <button
                      onClick={() => navigate(`/consultations/${item.id}`)}
                      style={{
                        padding: "5px 14px",
                        background: "#eff6ff", color: colors.primary,
                        border: `1px solid #bfdbfe`,
                        borderRadius: radius.md, cursor: "pointer",
                        fontSize: font.sm, fontWeight: 600,
                      }}
                    >
                      Open
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {!isLoading && (data?.queue?.length ?? 0) === 0 && (
            <p style={{ color: colors.textMuted, textAlign: "center", padding: "32px 0" }}>
              Queue is empty for today.
            </p>
          )}
        </div>

        {/* ── Completed today ── */}
        {completedItems.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: font.md, fontWeight: 700, color: colors.text }}>
              Completed Today
              <span style={{ marginLeft: 8, fontSize: font.sm, fontWeight: 500, color: colors.textMuted }}>
                ({completedItems.length})
              </span>
            </h2>

            <div style={{ display: "grid", gap: 10 }}>
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radius.lg,
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                  }}
                >
                  {/* Token */}
                  <div style={{ fontSize: 24, fontWeight: 700, color: colors.textMuted, minWidth: 60, textAlign: "center" }}>
                    {item.token_number != null ? `#${item.token_number}` : "—"}
                  </div>

                  {/* Patient info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: font.base, color: colors.text }}>
                      {item.patient_name}
                    </div>
                    <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
                      {item.patient_phone} · {item.appointment_type.replace("_", " ")} ·{" "}
                      {new Date(item.scheduled_at).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
                      {item.doctor_name && ` · Dr. ${item.doctor_name}`}
                    </div>
                  </div>

                  {/* Completed badge */}
                  <span style={{
                    background: "#f3f4f6", color: "#6b7280",
                    border: "1px solid #e5e7eb",
                    padding: "3px 10px", borderRadius: 999,
                    fontSize: font.sm, fontWeight: 500, whiteSpace: "nowrap",
                  }}>
                    ✓ Completed
                  </span>

                  {/* View button — visible to all roles */}
                  <button
                    onClick={() => navigate(`/consultations/${item.id}`)}
                    style={{
                      padding: "5px 14px", flexShrink: 0,
                      background: colors.primaryLight, color: colors.primary,
                      border: `1px solid #bfdbfe`,
                      borderRadius: radius.md, cursor: "pointer",
                      fontSize: font.sm, fontWeight: 600,
                    }}
                  >
                    View →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

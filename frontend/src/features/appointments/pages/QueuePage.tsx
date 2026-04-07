import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import Toast, { useToast } from "@/shared/components/Toast";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { useAuthStore } from "@/features/auth/store/authStore";
import { appointmentsApi, type QueueItem } from "@/features/appointments/api/appointmentsApi";
import {
  consultationsApi,
  type StartConsultationPayload,
} from "@/features/consultations/api/consultationsApi";

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  in_progress: { bg: "#059669", color: "#fff" },
  in_queue: { bg: colors.primary, color: "#fff" },
  confirmed: { bg: "#d97706", color: "#fff" },
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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["queue-live", today],
    queryFn: () => appointmentsApi.getQueue(today),
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const handleStarted = (appointmentId: string) => {
    setStartingItem(null);
    qc.invalidateQueries({ queryKey: ["queue-live", today] });
    navigate(`/consultations/${appointmentId}`);
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
            <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>
              Live Queue — {today}
            </h1>
            <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
              {data?.total ?? 0} patient{data?.total !== 1 ? "s" : ""} in queue
            </p>
          </div>
          <button
            onClick={() => refetch()}
            style={{ padding: "9px 20px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontWeight: 600, fontSize: font.base }}
          >
            Refresh
          </button>
        </div>

        {isLoading && <p style={{ color: colors.textMuted }}>Loading queue…</p>}

        <div style={{ display: "grid", gap: 12 }}>
          {data?.queue?.map((item: QueueItem) => {
            const ss = STATUS_STYLES[item.status];
            return (
              <div
                key={item.id}
                style={{
                  background: colors.white,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.lg,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  boxShadow: shadow.sm,
                }}
              >
                {/* Token number */}
                <div style={{ fontSize: 36, fontWeight: 700, color: colors.primary, minWidth: 60, textAlign: "center" }}>
                  #{item.token_number}
                </div>

                {/* Patient info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: font.base, color: colors.text }}>
                    {item.patient_name}
                  </div>
                  <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
                    {item.patient_phone} · {item.appointment_type.replace("_", " ")} ·{" "}
                    {new Date(item.scheduled_at).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
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

                {/* Action buttons — clinical staff only */}
                {isClinical && (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {/* Start — opens the chief complaints modal which starts the consultation */}
                    {["confirmed", "in_queue"].includes(item.status) && (
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
                    {/* Open — navigate to the active consultation */}
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
                )}
              </div>
            );
          })}

          {!isLoading && (data?.queue?.length ?? 0) === 0 && (
            <p style={{ color: colors.textMuted, textAlign: "center", padding: "32px 0" }}>
              Queue is empty for today.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

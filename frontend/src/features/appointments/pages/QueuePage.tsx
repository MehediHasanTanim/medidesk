import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import Toast, { useToast } from "@/shared/components/Toast";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { useAuthStore } from "@/features/auth/store/authStore";
import { appointmentsApi, type QueueItem } from "@/features/appointments/api/appointmentsApi";

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  in_progress: { bg: "#059669", color: "#fff" },
  in_queue: { bg: colors.primary, color: "#fff" },
  confirmed: { bg: "#d97706", color: "#fff" },
};

export default function QueuePage() {
  const today = new Date().toISOString().split("T")[0];
  const { user } = useAuthStore();
  const isClinical = ["doctor", "assistant_doctor"].includes(user?.role ?? "");
  const qc = useQueryClient();
  const { toast, show: showToast, dismiss } = useToast();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["queue-live", today],
    queryFn: () => appointmentsApi.getQueue(today),
    refetchInterval: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["queue-live", today] });
      const labels: Record<string, string> = {
        in_progress: "Consultation started",
        completed: "Appointment completed",
      };
      showToast(labels[status] ?? "Status updated", "success");
    },
    onError: () => showToast("Failed to update status", "error"),
  });

  return (
    <AppShell>
      <Toast message={toast?.message ?? null} type={toast?.type} onDismiss={dismiss} />

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
              style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}
            >
              Live Queue — {today}
            </h1>
            <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
              {data?.total ?? 0} patient{data?.total !== 1 ? "s" : ""} in queue
            </p>
          </div>
          <button
            onClick={() => refetch()}
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
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: colors.primary,
                    minWidth: 60,
                    textAlign: "center",
                  }}
                >
                  #{item.token_number}
                </div>

                {/* Patient info */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontWeight: 600, fontSize: font.base, color: colors.text }}
                  >
                    {item.patient_name}
                  </div>
                  <div style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
                    {item.patient_phone} · {item.appointment_type.replace("_", " ")} ·{" "}
                    {new Date(item.scheduled_at).toLocaleTimeString("en-BD", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {item.notes && (
                    <div
                      style={{
                        color: colors.textMuted,
                        fontSize: font.sm,
                        fontStyle: "italic",
                        marginTop: 4,
                      }}
                    >
                      {item.notes}
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <span
                  style={{
                    background: ss?.bg ?? colors.textMuted,
                    color: ss?.color ?? "#fff",
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: font.sm,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.status.replace(/_/g, " ")}
                </span>

                {/* Action buttons — clinical staff only */}
                {isClinical && (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {["confirmed", "in_queue"].includes(item.status) && (
                      <button
                        onClick={() =>
                          statusMutation.mutate({ id: item.id, status: "in_progress" })
                        }
                        disabled={statusMutation.isPending}
                        style={{
                          padding: "5px 14px",
                          background: "#fef3c7",
                          color: "#92400e",
                          border: `1px solid #fde68a`,
                          borderRadius: radius.md,
                          cursor: "pointer",
                          fontSize: font.sm,
                          fontWeight: 600,
                        }}
                      >
                        Start
                      </button>
                    )}
                    {item.status === "in_progress" && (
                      <button
                        onClick={() =>
                          statusMutation.mutate({ id: item.id, status: "completed" })
                        }
                        disabled={statusMutation.isPending}
                        style={{
                          padding: "5px 14px",
                          background: "#f0fdf4",
                          color: "#166534",
                          border: `1px solid #bbf7d0`,
                          borderRadius: radius.md,
                          cursor: "pointer",
                          fontSize: font.sm,
                          fontWeight: 600,
                        }}
                      >
                        Complete
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

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/shared/lib/apiClient";
import AppShell from "@/shared/components/AppShell";
import { colors, font, radius, shadow } from "@/shared/styles/theme";

const STATUS_COLORS: Record<string, string> = {
  in_progress: "#059669",
  in_queue: colors.primary,
  confirmed: "#d97706",
};

export default function QueuePage() {
  const today = new Date().toISOString().split("T")[0];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["queue", today],
    queryFn: () => apiClient.get("/appointments/queue/", { params: { date: today } }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>Live Queue — {today}</h1>
            <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>Total: {data?.total ?? 0} patients</p>
          </div>
          <button onClick={() => refetch()} style={{ padding: "9px 20px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, cursor: "pointer", fontWeight: 600, fontSize: font.base }}>
            Refresh
          </button>
        </div>

        {isLoading && <p style={{ color: colors.textMuted }}>Loading queue…</p>}

        <div style={{ display: "grid", gap: 12 }}>
          {data?.queue?.map((item: any) => (
            <div key={item.id} style={{ background: colors.white, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: 20, display: "flex", alignItems: "center", gap: 20, boxShadow: shadow.sm }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: colors.primary, minWidth: 60, textAlign: "center" }}>
                #{item.token_number}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: font.base, color: colors.text }}>{item.patient_id}</div>
                <div style={{ color: colors.textMuted, fontSize: font.sm }}>
                  {item.appointment_type.replace("_", " ")} · {new Date(item.scheduled_at).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <span style={{ background: STATUS_COLORS[item.status] || colors.textMuted, color: colors.white, padding: "4px 12px", borderRadius: 999, fontSize: font.sm, fontWeight: 500 }}>
                {item.status.replace("_", " ")}
              </span>
            </div>
          ))}
          {data?.queue?.length === 0 && <p style={{ color: colors.textMuted }}>Queue is empty for today.</p>}
        </div>
      </div>
    </AppShell>
  );
}

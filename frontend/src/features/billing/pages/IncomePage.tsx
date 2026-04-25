import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { billingApi, PAYMENT_METHOD_LABELS } from "@/features/billing/api/billingApi";
import type { DailyIncomeRow } from "@/features/billing/api/billingApi";

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  fontSize: font.base,
  color: colors.text,
  background: colors.white,
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function fmt(n: number) {
  return n.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-BD", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm,
      padding: "20px 24px", flex: "1 1 180px", minWidth: 160,
    }}>
      <div style={{ fontSize: font.sm, color: colors.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: color ?? colors.text }}>
        ৳{value}
      </div>
      {sub && <div style={{ fontSize: font.sm, color: colors.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Method pill ───────────────────────────────────────────────────────────────
const METHOD_COLORS: Record<string, string> = {
  cash:  "#059669",
  bkash: "#db2777",
  nagad: "#d97706",
  card:  "#1a56db",
};

function MethodBadge({ method, amount }: { method: string; amount: number }) {
  const color = METHOD_COLORS[method] ?? colors.textMuted;
  return (
    <div style={{
      background: `${color}12`, border: `1px solid ${color}33`,
      borderRadius: radius.md, padding: "10px 16px", flex: "1 1 120px", minWidth: 110,
    }}>
      <div style={{ fontSize: "11px", color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] ?? method}
      </div>
      <div style={{ fontSize: font.md, fontWeight: 700, color }}>৳{fmt(amount)}</div>
    </div>
  );
}

// ── Quick date shortcuts ───────────────────────────────────────────────────────
const SHORTCUTS = [
  { label: "Today",      from: todayStr(),    to: todayStr() },
  { label: "Yesterday",  from: nDaysAgo(1),   to: nDaysAgo(1) },
  { label: "Last 7 days",from: nDaysAgo(6),   to: todayStr() },
  { label: "Last 30 days",from: nDaysAgo(29), to: todayStr() },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function IncomePage() {
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate,   setToDate]   = useState(todayStr());
  const [applied,  setApplied]  = useState({ from: todayStr(), to: todayStr() });

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["income-report", applied.from, applied.to],
    queryFn: () => billingApi.getIncomeReport(applied.from, applied.to),
    staleTime: 60_000,
  });

  function apply() {
    setApplied({ from: fromDate, to: toDate });
  }

  function applyShortcut(from: string, to: string) {
    setFromDate(from);
    setToDate(to);
    setApplied({ from, to });
  }

  const loading = isLoading || isFetching;

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>Income Report</h1>
          <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>
            Daily collection breakdown by payment method
          </p>
        </div>

        {/* Date range filter */}
        <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                From
              </label>
              <input type="date" value={fromDate} max={toDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: font.sm, fontWeight: 600, color: colors.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                To
              </label>
              <input type="date" value={toDate} min={fromDate} max={todayStr()} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
            </div>
            <button
              onClick={apply}
              disabled={loading}
              style={{ padding: "8px 22px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Loading…" : "Apply"}
            </button>
          </div>

          {/* Shortcuts */}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {SHORTCUTS.map((s) => {
              const active = applied.from === s.from && applied.to === s.to;
              return (
                <button
                  key={s.label}
                  onClick={() => applyShortcut(s.from, s.to)}
                  style={{
                    padding: "4px 14px", borderRadius: 999, fontSize: font.sm, cursor: "pointer", fontWeight: 500,
                    background: active ? colors.primary : colors.bg,
                    color: active ? colors.white : colors.textMuted,
                    border: `1px solid ${active ? colors.primary : colors.border}`,
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {isError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: colors.danger, padding: "12px 16px", borderRadius: radius.md, marginBottom: 20 }}>
            Failed to load income report.
          </div>
        )}

        {data && (
          <>
            {/* Summary stats */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
              <StatCard
                label="Total Collected"
                value={fmt(data.total_collected)}
                sub={`${formatDate(data.from_date)}${data.from_date !== data.to_date ? ` – ${formatDate(data.to_date)}` : ""}`}
                color={colors.primary}
              />
              <StatCard
                label="Invoices Raised"
                value={String(data.total_invoices)}
                sub={`${data.paid_invoices} fully paid`}
              />
            </div>

            {/* By-method breakdown */}
            <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: "20px 24px", marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: font.md, fontWeight: 700 }}>By Payment Method</h2>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {(["cash", "bkash", "nagad", "card"] as const).map((m) => (
                  <MethodBadge key={m} method={m} amount={data.by_method[m]} />
                ))}
              </div>
            </div>

            {/* Daily breakdown table */}
            <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", borderBottom: `1px solid ${colors.border}` }}>
                <h2 style={{ margin: 0, fontSize: font.md, fontWeight: 700 }}>Daily Breakdown</h2>
              </div>

              {data.daily_breakdown.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: colors.textMuted }}>
                  No payments recorded in this date range.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: colors.bg }}>
                      {["Date", "Cash", "bKash", "Nagad", "Card", "Total"].map((h, i) => (
                        <th key={h} style={{
                          padding: "10px 16px",
                          textAlign: i === 0 ? "left" : "right",
                          fontSize: font.sm, fontWeight: 600,
                          color: colors.textMuted,
                          borderBottom: `1px solid ${colors.border}`,
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.daily_breakdown as DailyIncomeRow[]).map((row) => (
                      <tr key={row.date} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                        <td style={{ padding: "11px 16px", fontWeight: 500, fontSize: font.base }}>
                          {formatDate(row.date)}
                        </td>
                        {(["cash", "bkash", "nagad", "card"] as const).map((m) => (
                          <td key={m} style={{ padding: "11px 16px", textAlign: "right", fontSize: font.base, color: row[m] > 0 ? METHOD_COLORS[m] : colors.textMuted }}>
                            {row[m] > 0 ? `৳${fmt(row[m])}` : "—"}
                          </td>
                        ))}
                        <td style={{ padding: "11px 16px", textAlign: "right", fontWeight: 700, fontSize: font.base, color: colors.text }}>
                          ৳{fmt(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: colors.bg, borderTop: `2px solid ${colors.border}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: font.base }}>Total</td>
                      {(["cash", "bkash", "nagad", "card"] as const).map((m) => (
                        <td key={m} style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontSize: font.base, color: data.by_method[m] > 0 ? METHOD_COLORS[m] : colors.textMuted }}>
                          {data.by_method[m] > 0 ? `৳${fmt(data.by_method[m])}` : "—"}
                        </td>
                      ))}
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontSize: font.md, color: colors.primary }}>
                        ৳{fmt(data.total_collected)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

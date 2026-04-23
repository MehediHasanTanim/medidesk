import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import { useAuthStore } from "@/features/auth/store/authStore";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { ROLE_LABELS } from "@/shared/types/auth";
import { fetchDashboardStats, type DashboardStats } from "@/features/dashboard/api/dashboardApi";

// ── Quick-action cards (unchanged) ──────────────────────────────────────────

interface QuickCard {
  label: string;
  description: string;
  path: string;
  icon: string;
  color: string;
  roles?: string[];
}

const QUICK_CARDS: QuickCard[] = [
  { label: "Patients",     description: "Search and manage patient records",  path: "/patients",     icon: "👤", color: "#1d4ed8" },
  { label: "Appointments", description: "Book and manage appointments",         path: "/appointments", icon: "📅", color: "#059669" },
  { label: "Live Queue",   description: "Today's consultation queue",           path: "/queue",        icon: "🔢", color: "#d97706" },
  { label: "Users",        description: "Manage staff accounts",               path: "/users",        icon: "👥", color: "#7c3aed", roles: ["admin"] },
  { label: "Chambers",     description: "Clinic branches and rooms",            path: "/chambers",     icon: "🏥", color: "#0891b2", roles: ["admin"] },
];

// ── Stat card widget ─────────────────────────────────────────────────────────

interface StatItem {
  label: string;
  value: string | number;
  icon: string;
  accent: string;
}

function StatCard({ label, value, icon, accent }: StatItem) {
  return (
    <div style={{
      background: colors.white,
      borderRadius: radius.lg,
      boxShadow: shadow.sm,
      border: `1px solid ${colors.border}`,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: radius.md,
        background: `${accent}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, marginBottom: 4,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: font.sm, color: colors.textMuted, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

// ── Currency formatter (BDT) ─────────────────────────────────────────────────

function bdt(amount: number): string {
  return `৳\u202f${Math.round(amount).toLocaleString("en-IN")}`;
}

// ── Role-specific stat builders ──────────────────────────────────────────────

function buildStatCards(stats: DashboardStats): StatItem[] {
  const role = stats.role;

  if (role === "doctor") {
    return [
      { label: "Today's Appointments", value: stats.today_appointments ?? 0, icon: "📅", accent: colors.primary },
      { label: "Pending Rx Approvals", value: stats.pending_rx_approvals ?? 0, icon: "📋", accent: (stats.pending_rx_approvals ?? 0) > 0 ? colors.warning : colors.success },
      { label: "Today's Revenue",       value: bdt(stats.today_revenue ?? 0),  icon: "💰", accent: colors.success },
    ];
  }

  if (role === "assistant_doctor") {
    return [
      { label: "Today's Appointments", value: stats.today_appointments ?? 0,     icon: "📅", accent: colors.primary },
      { label: "My Pending Drafts",    value: stats.pending_rx_approvals ?? 0,   icon: "📋", accent: (stats.pending_rx_approvals ?? 0) > 0 ? colors.warning : colors.success },
    ];
  }

  if (role === "trainee") {
    return [
      { label: "Today's Appointments", value: stats.today_appointments ?? 0, icon: "📅", accent: colors.primary },
    ];
  }

  if (role === "receptionist" || role === "assistant") {
    return [
      { label: "Active Today",   value: stats.queue_total      ?? 0, icon: "🔢", accent: colors.primary },
      { label: "Waiting",        value: stats.queue_waiting    ?? 0, icon: "⏳", accent: "#7c3aed" },
      { label: "In Progress",    value: stats.queue_in_progress ?? 0, icon: "🔄", accent: colors.warning },
      { label: "Completed",      value: stats.queue_done       ?? 0, icon: "✅", accent: colors.success },
      { label: "Pending Invoices", value: stats.pending_invoices ?? 0, icon: "📄", accent: (stats.pending_invoices ?? 0) > 0 ? colors.warning : colors.textMuted },
      { label: "Collected Today", value: bdt(stats.today_collected ?? 0), icon: "💰", accent: colors.success },
    ];
  }

  // admin / super_admin
  return [
    { label: "Today's Appointments", value: stats.today_appointments ?? 0,  icon: "📅", accent: colors.primary },
    { label: "Waiting in Queue",     value: stats.queue_waiting     ?? 0,  icon: "⏳", accent: "#7c3aed" },
    { label: "Today's Revenue",      value: bdt(stats.today_revenue ?? 0), icon: "💰", accent: colors.success },
    { label: "Pending Rx Approvals", value: stats.pending_rx_approvals ?? 0, icon: "📋", accent: (stats.pending_rx_approvals ?? 0) > 0 ? colors.warning : colors.textMuted },
  ];
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, canAccess } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    staleTime: 60_000, // refresh every 60 s on re-focus
  });

  const visibleCards = QUICK_CARDS.filter(
    (c) => !c.roles || canAccess(c.roles as Parameters<typeof canAccess>[0])
  );

  const statCards = stats ? buildStatCards(stats) : [];

  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>

        {/* Welcome header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: font.xxl, fontWeight: 700, color: colors.text }}>
            Welcome back, {user?.full_name?.split(" ")[0]}
          </h1>
          <p style={{ margin: 0, color: colors.textMuted, fontSize: font.md }}>
            {user ? ROLE_LABELS[user.role] : ""} · MediDesk Clinic Management
          </p>
        </div>

        {/* Role-specific stat widgets */}
        {statsLoading && (
          <div style={{ marginBottom: 32, color: colors.textMuted, fontSize: font.sm }}>
            Loading stats…
          </div>
        )}
        {statCards.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <h2 style={{
              margin: "0 0 14px",
              fontSize: font.base,
              fontWeight: 600,
              color: colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              Today's Overview
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}>
              {statCards.map((s) => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>
          </div>
        )}

        {/* Quick action cards */}
        <div style={{ marginBottom: 14 }}>
          <h2 style={{
            margin: "0 0 14px",
            fontSize: font.base,
            fontWeight: 600,
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            Quick Actions
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {visibleCards.map((card) => (
            <Link key={card.path} to={card.path} style={{ textDecoration: "none" }}>
              <div style={{
                background: colors.white, borderRadius: radius.lg,
                boxShadow: shadow.sm, padding: "22px 24px",
                border: `1px solid ${colors.border}`,
                transition: "box-shadow 0.15s, transform 0.15s",
                cursor: "pointer",
              }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = shadow.md;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = shadow.sm;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: radius.md,
                  background: `${card.color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, marginBottom: 14,
                }}>
                  {card.icon}
                </div>
                <div style={{ fontWeight: 600, fontSize: font.md, color: colors.text, marginBottom: 4 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: font.sm, color: colors.textMuted }}>
                  {card.description}
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </AppShell>
  );
}

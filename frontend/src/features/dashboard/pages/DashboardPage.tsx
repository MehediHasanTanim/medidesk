import { Link } from "react-router-dom";
import AppShell from "@/shared/components/AppShell";
import { useAuthStore } from "@/features/auth/store/authStore";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { ROLE_LABELS } from "@/shared/types/auth";

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

export default function DashboardPage() {
  const { user, canAccess } = useAuthStore();

  const visibleCards = QUICK_CARDS.filter(
    (c) => !c.roles || canAccess(c.roles as Parameters<typeof canAccess>[0])
  );

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

        {/* Quick action cards */}
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

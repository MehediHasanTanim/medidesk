import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { colors, font } from "@/shared/styles/theme";
import { ROLE_LABELS, ROLE_COLORS } from "@/shared/types/auth";
import type { UserRole } from "@/shared/types/auth";

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles?: UserRole[]; // undefined = all roles
}

const NAV_ITEMS: NavItem[] = [
  { path: "/",             label: "Dashboard",    icon: "⊞" },
  { path: "/patients",     label: "Patients",     icon: "👤", roles: ["doctor", "assistant_doctor", "receptionist", "assistant"] },
  { path: "/appointments", label: "Appointments", icon: "📅", roles: ["doctor", "assistant_doctor", "receptionist", "assistant"] },
  { path: "/queue",        label: "Live Queue",   icon: "🔢", roles: ["doctor", "assistant_doctor", "receptionist", "assistant"] },
  { path: "/billing",      label: "Billing",      icon: "💳", roles: ["receptionist", "assistant"] },
  { path: "/prescriptions", label: "Rx Approvals", icon: "💊", roles: ["doctor"] },
  { path: "/medicines",    label: "Medicines",    icon: "🧪", roles: ["doctor", "assistant_doctor", "super_admin", "admin"] },
  { path: "/users",        label: "Users",        icon: "👥", roles: ["super_admin", "admin"] },
  { path: "/chambers",     label: "Chambers",     icon: "🏥", roles: ["super_admin", "admin"] },
  { path: "/doctors",      label: "Doctors",      icon: "👨‍⚕️", roles: ["super_admin", "admin"] },
];

interface Props {
  children: React.ReactNode;
}

export default function AppShell({ children }: Props) {
  const { user, logout, canAccess } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const refresh = localStorage.getItem("refresh_token");
    logout();
    navigate("/login", { replace: true });
    if (refresh) {
      import("@/shared/lib/apiClient").then(({ default: api }) => {
        api.post("/auth/logout/", { refresh }).catch(() => {});
      });
    }
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || canAccess(item.roles)
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: font.family, background: colors.bg }}>
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside style={{
        width: 228,
        minWidth: 228,
        background: colors.sidebar,
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ color: colors.white, fontSize: font.xl, fontWeight: 700, letterSpacing: "-0.5px" }}>
            MediDesk
          </div>
          <div style={{ color: colors.sidebarText, fontSize: font.sm, marginTop: 2 }}>
            Clinic Management
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "12px 0" }}>
          {visibleItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 20px",
                  color: active ? colors.white : colors.sidebarText,
                  background: active ? colors.sidebarActive : "transparent",
                  textDecoration: "none",
                  fontSize: font.base,
                  fontWeight: active ? 600 : 400,
                  borderRadius: "0 8px 8px 0",
                  margin: "1px 8px 1px 0",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = colors.sidebarHover;
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link
            to="/profile"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 12 }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: user ? ROLE_COLORS[user.role] : colors.primary,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: colors.white, fontWeight: 700, fontSize: font.base,
              flexShrink: 0,
            }}>
              {user?.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ color: colors.white, fontSize: font.base, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.full_name}
              </div>
              <div style={{ fontSize: font.sm }}>
                <span style={{
                  background: user ? ROLE_COLORS[user.role] : colors.primary,
                  color: colors.white,
                  padding: "1px 7px",
                  borderRadius: 999,
                  fontSize: "11px",
                  fontWeight: 600,
                }}>
                  {user ? ROLE_LABELS[user.role] : ""}
                </span>
              </div>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            style={{
              width: "100%", padding: "7px 0",
              background: "rgba(239,68,68,0.15)", color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6,
              cursor: "pointer", fontSize: font.sm, fontWeight: 500,
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
}

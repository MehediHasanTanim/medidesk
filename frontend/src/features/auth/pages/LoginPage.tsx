import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import apiClient from "@/shared/lib/apiClient";
import queryClient from "@/shared/lib/queryClient";
import { colors, font, radius, shadow } from "@/shared/styles/theme";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.post("/auth/login/", { username, password });
      // Backend returns user info directly in the login response body
      queryClient.clear();
      setAuth(data.user, data.access, data.refresh);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setError("Invalid username or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: font.family, background: colors.bg }}>
      {/* ── Left branding panel ──────────────────────────────────────── */}
      <div style={{
        flex: "0 0 400px", background: colors.sidebar,
        display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "48px 40px",
      }}>
        <div style={{ color: colors.white, fontSize: 34, fontWeight: 800, letterSpacing: "-1px", marginBottom: 8 }}>
          MediDesk
        </div>
        <div style={{ color: colors.sidebarText, fontSize: font.md, lineHeight: 1.6, maxWidth: 280 }}>
          Clinic Management System for modern healthcare practices.
        </div>
        <div style={{ marginTop: 40 }}>
          {[
            { icon: "🔒", text: "Secure role-based access" },
            { icon: "📋", text: "Patient records & consultations" },
            { icon: "💊", text: "Digital prescriptions" },
            { icon: "💳", text: "Billing — Cash, bKash, Nagad" },
          ].map((f) => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              <span style={{ color: colors.sidebarText, fontSize: font.base }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{
          width: "100%", maxWidth: 400,
          background: colors.white, borderRadius: radius.lg,
          padding: 40, boxShadow: shadow.md,
        }}>
          <h2 style={{ margin: "0 0 4px", color: colors.text, fontSize: font.xl, fontWeight: 700 }}>
            Sign in
          </h2>
          <p style={{ margin: "0 0 28px", color: colors.textMuted, fontSize: font.base }}>
            Enter your credentials to access the system
          </p>

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              color: "#b91c1c", padding: "10px 14px",
              borderRadius: radius.md, marginBottom: 20, fontSize: font.base,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: colors.text, fontSize: font.base }}>
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
              style={{
                width: "100%", padding: "10px 14px",
                border: `1px solid ${colors.border}`, borderRadius: radius.md,
                fontSize: font.md, color: colors.text, outline: "none",
                boxSizing: "border-box", marginBottom: 18, background: colors.bg,
              }}
            />

            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: colors.text, fontSize: font.base }}>
              Password
            </label>
            <div style={{ position: "relative", marginBottom: 28 }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                style={{
                  width: "100%", padding: "10px 44px 10px 14px",
                  border: `1px solid ${colors.border}`, borderRadius: radius.md,
                  fontSize: font.md, color: colors.text, outline: "none",
                  boxSizing: "border-box", background: colors.bg,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: colors.textMuted, fontSize: 16, padding: 0, lineHeight: 1,
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "11px 0",
                background: loading ? "#93c5fd" : colors.primary,
                color: colors.white, border: "none",
                borderRadius: radius.md, fontSize: font.md,
                fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

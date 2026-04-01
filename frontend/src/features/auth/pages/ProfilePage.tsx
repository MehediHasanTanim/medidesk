import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "@/shared/components/AppShell";
import { useAuthStore } from "@/features/auth/store/authStore";
import apiClient from "@/shared/lib/apiClient";
import { colors, font, radius, shadow } from "@/shared/styles/theme";
import { ROLE_LABELS, ROLE_COLORS } from "@/shared/types/auth";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: font.sm, color: colors.textMuted, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: font.md, color: colors.text }}>{value}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore();
  const qc = useQueryClient();

  // Profile edit
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileMsg, setProfileMsg] = useState("");

  // Password change
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  const updateProfile = useMutation({
    mutationFn: (body: { full_name?: string; email?: string }) =>
      apiClient.patch("/auth/me/", body).then((r) => r.data),
    onSuccess: (data) => {
      const refresh = localStorage.getItem("refresh_token") ?? "";
      const access = localStorage.getItem("access_token") ?? "";
      setAuth({ ...data }, access, refresh);
      setEditing(false);
      setProfileMsg("Profile updated.");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const changePassword = useMutation({
    mutationFn: (body: { old_password: string; new_password: string }) =>
      apiClient.post("/auth/change-password/", body),
    onSuccess: () => {
      setPwMsg("Password changed successfully.");
      setPwError("");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setPwError(msg ?? "Failed to change password.");
      setPwMsg("");
    },
  });

  const handleProfileSave = () => {
    updateProfile.mutate({ full_name: fullName, email });
  };

  const handlePasswordChange = () => {
    setPwMsg(""); setPwError("");
    if (newPassword.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords do not match."); return; }
    changePassword.mutate({ old_password: oldPassword, new_password: newPassword });
  };

  if (!user) return null;

  return (
    <AppShell>
      <div style={{ padding: "32px 40px", maxWidth: 720 }}>
        <h1 style={{ margin: "0 0 28px", fontSize: font.xl, fontWeight: 700, color: colors.text }}>
          My Profile
        </h1>

        {/* Profile card */}
        <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: 28, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: ROLE_COLORS[user.role],
              display: "flex", alignItems: "center", justifyContent: "center",
              color: colors.white, fontWeight: 700, fontSize: font.xl,
            }}>
              {user.full_name[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: font.lg, color: colors.text }}>{user.full_name}</div>
              <span style={{
                background: ROLE_COLORS[user.role], color: colors.white,
                padding: "2px 10px", borderRadius: 999, fontSize: font.sm, fontWeight: 600,
              }}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>

          {!editing ? (
            <>
              <Field label="Username" value={user.username} />
              <Field label="Full Name" value={user.full_name} />
              <Field label="Email" value={user.email || "—"} />
              {profileMsg && <p style={{ color: colors.success, fontSize: font.sm }}>{profileMsg}</p>}
              <button
                onClick={() => { setEditing(true); setProfileMsg(""); }}
                style={{ marginTop: 8, padding: "8px 20px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}
              >
                Edit Profile
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: font.base, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: font.base, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleProfileSave}
                  disabled={updateProfile.isPending}
                  style={{ padding: "8px 20px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}
                >
                  {updateProfile.isPending ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{ padding: "8px 20px", background: colors.borderLight, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.md, fontWeight: 500, cursor: "pointer", fontSize: font.base }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        {/* Change password card */}
        <div style={{ background: colors.white, borderRadius: radius.lg, boxShadow: shadow.sm, padding: 28 }}>
          <h3 style={{ margin: "0 0 20px", fontSize: font.lg, fontWeight: 600, color: colors.text }}>Change Password</h3>

          {pwMsg && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "10px 14px", borderRadius: radius.md, marginBottom: 16, fontSize: font.base }}>{pwMsg}</div>}
          {pwError && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 14px", borderRadius: radius.md, marginBottom: 16, fontSize: font.base }}>{pwError}</div>}

          {[
            { label: "Current Password", value: oldPassword, onChange: setOldPassword },
            { label: "New Password", value: newPassword, onChange: setNewPassword },
            { label: "Confirm New Password", value: confirmPassword, onChange: setConfirmPassword },
          ].map((f) => (
            <div key={f.label} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: font.base }}>{f.label}</label>
              <input
                type="password"
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: font.base, boxSizing: "border-box" }}
              />
            </div>
          ))}

          <button
            onClick={handlePasswordChange}
            disabled={changePassword.isPending}
            style={{ padding: "8px 20px", background: colors.primary, color: colors.white, border: "none", borderRadius: radius.md, fontWeight: 600, cursor: "pointer", fontSize: font.base }}
          >
            {changePassword.isPending ? "Updating…" : "Update Password"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

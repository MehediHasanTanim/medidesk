import { Link } from "react-router-dom";
import AppShell from "@/shared/components/AppShell";
import { colors, font } from "@/shared/styles/theme";

export default function AppointmentsPage() {
  return (
    <AppShell>
      <div style={{ padding: "32px 40px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: font.xl, fontWeight: 700, color: colors.text }}>Appointments</h1>
          <p style={{ margin: "4px 0 0", color: colors.textMuted, fontSize: font.base }}>Schedule and manage patient appointments</p>
        </div>
        <p style={{ color: colors.textMuted }}>Appointment booking module — coming in Phase 1 sprint.</p>
        <Link to="/queue" style={{ color: colors.primary }}>→ View Live Queue</Link>
      </div>
    </AppShell>
  );
}

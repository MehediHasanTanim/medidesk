import { useEffect, useState } from "react";
import { colors, font, radius, shadow } from "@/shared/styles/theme";

interface ToastProps {
  message: string | null;
  type?: "success" | "error" | "info";
  onDismiss: () => void;
  duration?: number; // ms, default 3000
}

const TYPE_STYLES = {
  success: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", icon: "✓" },
  error:   { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", icon: "✕" },
  info:    { background: colors.primaryLight, border: "1px solid #bfdbfe", color: colors.primary, icon: "ℹ" },
};

export default function Toast({ message, type = "success", onDismiss, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) { setVisible(false); return; }
    setVisible(true);
    const hide = setTimeout(() => setVisible(false), duration - 300); // start fade before dismiss
    const dismiss = setTimeout(onDismiss, duration);
    return () => { clearTimeout(hide); clearTimeout(dismiss); };
  }, [message, duration, onDismiss]);

  if (!message) return null;

  const s = TYPE_STYLES[type];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        right: 32,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 18px",
        background: s.background,
        border: s.border,
        borderRadius: radius.lg,
        boxShadow: shadow.lg,
        fontSize: font.base,
        color: s.color,
        fontWeight: 500,
        maxWidth: 360,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        pointerEvents: "none",
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{s.icon}</span>
      <span>{message}</span>
    </div>
  );
}

// ── Convenience hook ───────────────────────────────────────────────────────
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const show = (message: string, type: "success" | "error" | "info" = "success") =>
    setToast({ message, type });

  const dismiss = () => setToast(null);

  return { toast, show, dismiss };
}

import { useState } from "react";
import { prescriptionsApi } from "@/features/prescriptions/api/prescriptionsApi";
import { colors, font, radius } from "@/shared/styles/theme";

interface Props {
  prescriptionId: string;
  /** Only show sharing for active/approved prescriptions, not drafts */
  status: "draft" | "active" | "approved";
}

type SendState = "idle" | "loading" | "ok" | "err";

export default function PrescriptionShareBar({ prescriptionId, status }: Props) {
  const [pdfState, setPdfState] = useState<SendState>("idle");
  const [waState, setWaState] = useState<SendState>("idle");
  const [emailState, setEmailState] = useState<SendState>("idle");

  if (status === "draft") return null;

  const handlePdf = async (download: boolean) => {
    setPdfState("loading");
    try {
      await prescriptionsApi.downloadPdf(prescriptionId, download);
      setPdfState("ok");
      setTimeout(() => setPdfState("idle"), 2000);
    } catch {
      setPdfState("err");
      setTimeout(() => setPdfState("idle"), 3000);
    }
  };

  const handleSend = async (channel: "whatsapp" | "email") => {
    const setter = channel === "whatsapp" ? setWaState : setEmailState;
    setter("loading");
    try {
      const res = await prescriptionsApi.send(prescriptionId, channel);
      setter(res.success ? "ok" : "err");
      setTimeout(() => setter("idle"), 2500);
    } catch {
      setter("err");
      setTimeout(() => setter("idle"), 3000);
    }
  };

  return (
    <div style={{
      marginTop: 16,
      paddingTop: 14,
      borderTop: `1px solid ${colors.border}`,
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      alignItems: "center",
    }}>
      <span style={{
        fontSize: font.sm, fontWeight: 600, color: colors.textMuted,
        marginRight: 4, letterSpacing: "0.04em",
      }}>
        SHARE
      </span>

      {/* Print (inline view) */}
      <ActionBtn
        label={pdfState === "loading" ? "Opening…" : pdfState === "ok" ? "Opened!" : pdfState === "err" ? "Error" : "Print"}
        icon="🖨"
        color="#1d4ed8"
        bg="#eff6ff"
        border="#bfdbfe"
        disabled={pdfState === "loading"}
        onClick={() => handlePdf(false)}
      />

      {/* Download PDF */}
      <ActionBtn
        label={pdfState === "loading" ? "Generating…" : pdfState === "ok" ? "Downloaded!" : pdfState === "err" ? "Error" : "Download PDF"}
        icon="⬇"
        color="#1d4ed8"
        bg="#eff6ff"
        border="#bfdbfe"
        disabled={pdfState === "loading"}
        onClick={() => handlePdf(true)}
      />

      {/* WhatsApp */}
      <ActionBtn
        label={waState === "loading" ? "Sending…" : waState === "ok" ? "Sent!" : waState === "err" ? "Failed" : "WhatsApp"}
        icon="💬"
        color="#166534"
        bg="#f0fdf4"
        border="#bbf7d0"
        disabled={waState === "loading"}
        onClick={() => handleSend("whatsapp")}
      />

      {/* Email */}
      <ActionBtn
        label={emailState === "loading" ? "Sending…" : emailState === "ok" ? "Sent!" : emailState === "err" ? "Failed" : "Email"}
        icon="✉"
        color="#7c3aed"
        bg="#f5f3ff"
        border="#ddd6fe"
        disabled={emailState === "loading"}
        onClick={() => handleSend("email")}
      />
    </div>
  );
}

function ActionBtn({
  label, icon, color, bg, border, disabled, onClick,
}: {
  label: string; icon: string; color: string; bg: string; border: string;
  disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "5px 13px", borderRadius: radius.md,
        border: `1px solid ${border}`,
        background: bg, color, cursor: disabled ? "not-allowed" : "pointer",
        fontSize: font.sm, fontWeight: 600,
        opacity: disabled ? 0.65 : 1,
        transition: "opacity 0.15s",
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

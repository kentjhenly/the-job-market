"use client";

import { useState } from "react";

export function ResendVerificationButton({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function resend() {
    setStatus("sending");

    const res = await fetch("/api/auth/send-verification-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, callbackURL: "/employer/terminal" }),
    });

    setStatus(res.ok ? "sent" : "error");
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={resend}
        disabled={status === "sending"}
        className="btn btn-primary btn-lg w-full"
      >
        {status === "sending" ? "SENDING..." : "RESEND VERIFICATION EMAIL"}
      </button>
      {status === "sent" && (
        <p className="mono" style={{ fontSize: 12, color: "var(--up)" }}>
          Verification email sent. Check your inbox.
        </p>
      )}
      {status === "error" && (
        <p className="mono" style={{ fontSize: 12, color: "var(--down)" }}>
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

export function NotificationsForm() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile/notifications")
      .then((res) => res.json())
      .then(({ email_notifications }) => {
        setEnabled(email_notifications ?? true);
        setLoading(false);
      });
  }, []);

  async function save(next: boolean) {
    setEnabled(next);
    await fetch("/api/profile/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_notifications: next }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">EMAIL NOTIFICATIONS</span>
      </div>
      <div className="space-y-4 p-4">
        <p className="mono" style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
          Activity emails let you know when you receive a new pitch or when a pitch is accepted. Account emails
          (verification, password, and email changes) are always sent.
        </p>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            disabled={loading}
            onChange={(e) => save(e.target.checked)}
            className="h-4 w-4 accent-up"
          />
          <span className="kicker">{enabled ? "ACTIVITY EMAILS ON" : "ACTIVITY EMAILS OFF"}</span>
        </label>
        {saved && (
          <span className="mono" style={{ fontSize: 11, color: "var(--up)" }}>
            SAVED ✓
          </span>
        )}
      </div>
    </div>
  );
}

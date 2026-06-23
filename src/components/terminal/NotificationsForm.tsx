"use client";

import { useEffect, useState } from "react";

export function NotificationsForm() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/profile/notifications")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error())))
      .then(({ email_notifications }) => setEnabled(email_notifications ?? true))
      .catch(() => {
        // Keep the default (on); the toggle stays usable on a failed load.
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    setError(false);
    const res = await fetch("/api/profile/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_notifications: next }),
    }).catch(() => null);
    if (res?.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setEnabled(previous); // revert the optimistic toggle on failure
      setError(true);
    }
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
        {error && (
          <span className="mono" style={{ fontSize: 11, color: "var(--down)" }}>
            COULD NOT SAVE · TRY AGAIN
          </span>
        )}
      </div>
    </div>
  );
}

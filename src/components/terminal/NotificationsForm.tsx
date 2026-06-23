"use client";

import { useEffect, useState } from "react";

interface NotificationsFormProps {
  role: "candidate" | "employer";
}

const CANDIDATE_ITEMS = [
  "New pitch from an employer",
  "New chat message in an accepted match",
  "Hire offer received",
];

const EMPLOYER_ITEMS = [
  "Candidate accepts your pitch",
  "New chat message in an accepted match",
  "Offer accepted, declined, or withdrawn",
];

export function NotificationsForm({ role }: NotificationsFormProps) {
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
      setEnabled(previous);
      setError(true);
    }
  }

  const items = role === "candidate" ? CANDIDATE_ITEMS : EMPLOYER_ITEMS;

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">EMAIL NOTIFICATIONS</span>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <p className="kicker mb-2" style={{ color: "var(--dim)" }}>
            WHEN ENABLED, YOU WILL RECEIVE EMAILS FOR:
          </p>
          <ul className="space-y-1.5 pl-1">
            {items.map((item) => (
              <li
                key={item}
                className="mono flex items-start gap-2"
                style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}
              >
                <span style={{ color: "var(--up)" }}>+</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="mono" style={{ fontSize: 10.5, color: "var(--dim)", lineHeight: 1.6 }}>
          Account emails (verification, password, and email changes) are always sent regardless of this setting.
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
            SAVED
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

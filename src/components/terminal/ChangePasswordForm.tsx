"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/Button";

export function ChangePasswordForm() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.next.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (form.next !== form.confirm) {
      setError("New passwords do not match");
      return;
    }

    setSaving(true);
    const { error: authError } = await authClient.changePassword({
      currentPassword: form.current,
      newPassword: form.next,
      revokeOtherSessions: true,
    });
    setSaving(false);

    if (authError) {
      setError(authError.message ?? "Could not change password");
      return;
    }

    setForm({ current: "", next: "", confirm: "" });
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  }

  return (
    <form onSubmit={submit} className="panel">
      <div className="panel-head">
        <span className="panel-title">CHANGE PASSWORD</span>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <label className="kicker mb-1.5 block">CURRENT PASSWORD</label>
          <input
            type="password"
            value={form.current}
            onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
            required
            className="field"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="kicker mb-1.5 block">NEW PASSWORD</label>
          <input
            type="password"
            value={form.next}
            onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
            required
            className="field"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="kicker mb-1.5 block">CONFIRM NEW PASSWORD</label>
          <input
            type="password"
            value={form.confirm}
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
            required
            className="field"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="mono" style={{ fontSize: 11, color: "var(--down)" }}>
            {error}
          </p>
        )}

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving}>
            UPDATE PASSWORD
          </Button>
          {done && (
            <span className="mono" style={{ fontSize: 11, color: "var(--up)" }}>
              PASSWORD UPDATED ✓
            </span>
          )}
        </div>

        <p className="mono" style={{ fontSize: 10.5, color: "var(--dim)", lineHeight: 1.6 }}>
          Updating your password signs out all other sessions.
        </p>
      </div>
    </form>
  );
}

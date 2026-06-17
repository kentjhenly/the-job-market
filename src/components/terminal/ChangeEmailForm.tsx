"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/Button";

export function ChangeEmailForm({ settingsHref }: { settingsHref: string }) {
  const router = useRouter();
  const { user } = useSession();
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!newEmail.includes("@")) {
      setError("Enter a valid email address");
      return;
    }

    setSaving(true);
    const { error: authError } = await authClient.changeEmail({
      newEmail,
      callbackURL: settingsHref,
    });
    setSaving(false);

    if (authError) {
      setError(authError.message ?? "Could not change email");
      return;
    }

    // A verified address requires confirming via a link sent to the current
    // inbox; an unverified one (candidates) changes immediately.
    if (user?.emailVerified) {
      setMessage(`Confirmation link sent to ${user.email}. Click it to finish the change.`);
    } else {
      setMessage("Email updated.");
      router.refresh();
    }
    setNewEmail("");
  }

  return (
    <form onSubmit={submit} className="panel">
      <div className="panel-head">
        <span className="panel-title">CHANGE EMAIL</span>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <label className="kicker mb-1.5 block">CURRENT EMAIL</label>
          <input value={user?.email ?? ""} disabled className="field" />
        </div>
        <div>
          <label className="kicker mb-1.5 block">NEW EMAIL</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className="field"
          />
        </div>

        {error && (
          <p className="mono" style={{ fontSize: 11, color: "var(--down)" }}>
            {error}
          </p>
        )}
        {message && (
          <p className="mono" style={{ fontSize: 11, color: "var(--up)" }}>
            {message}
          </p>
        )}

        <Button type="submit" loading={saving}>
          UPDATE EMAIL
        </Button>
      </div>
    </form>
  );
}

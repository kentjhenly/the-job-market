"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/Button";

export function DeleteAccountForm() {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    setDeleting(true);
    const { error: authError } = await authClient.deleteUser({ password });
    setDeleting(false);

    if (authError) {
      setError(authError.message ?? "Could not delete account");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Self-service data export (PDPO DPP6 access right). Plain GET that
          returns an attachment, so a normal link triggers the download. */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">YOUR DATA</span>
        </div>
        <div className="space-y-3 p-4">
          <p className="mono" style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
            Download a copy of all the personal data we hold about you, including your profile, postings,
            portfolio, matches, and activity, as a single JSON file.
          </p>
          <a
            href="/api/me/export"
            className="btn btn-ghost btn-sm"
            style={{ display: "inline-flex", width: "fit-content" }}
          >
            DOWNLOAD MY DATA →
          </a>
        </div>
      </div>

      <div className="panel" style={{ borderColor: "color-mix(in oklch, var(--down) 45%, transparent)" }}>
      <div className="panel-head" style={{ borderColor: "color-mix(in oklch, var(--down) 45%, transparent)" }}>
        <span className="panel-title" style={{ color: "var(--down)" }}>
          DELETE ACCOUNT
        </span>
      </div>
      <div className="space-y-4 p-4">
        <p className="mono" style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
          This permanently deletes your account, profile, postings, portfolio, and chats. Pitches you sent or received
          are removed. This cannot be undone.
        </p>

        {!armed ? (
          <Button variant="danger" onClick={() => setArmed(true)}>
            DELETE ACCOUNT
          </Button>
        ) : (
          <form onSubmit={remove} className="space-y-4">
            <div>
              <label className="kicker mb-1.5 block">CONFIRM YOUR PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="field"
                placeholder="••••••••"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-up"
              />
              <span className="mono" style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.5 }}>
                I understand this is permanent and cannot be undone.
              </span>
            </label>

            {error && (
              <p className="mono" style={{ fontSize: 11, color: "var(--down)" }}>
                {error}
              </p>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" variant="danger" loading={deleting} disabled={!confirmed || !password}>
                PERMANENTLY DELETE
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setArmed(false);
                  setConfirmed(false);
                  setPassword("");
                  setError("");
                }}
              >
                CANCEL
              </Button>
            </div>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}

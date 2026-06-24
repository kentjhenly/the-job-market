"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { SubscriptionStatus } from "@/lib/supabase/types";

interface Props {
  status: SubscriptionStatus;
}

export function UpgradePanel({ status }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/subscription/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "starter" }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "CHECKOUT FAILED");
      setLoading(false);
    }
  }

  return (
    <div className="view-enter space-y-4">
      <div>
        <h1 className="mono" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
          FEED
        </h1>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">UPGRADE TO ACCESS THE FEED</span>
          {status === "past_due" && <Badge variant="down">PAST DUE</Badge>}
        </div>
        <div className="space-y-4 p-4">
          <p className="mono" style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>
            {status === "past_due"
              ? "Your last payment didn't go through. Renew your subscription to restore access to the candidate feed and pitching."
              : "An active subscription is required to browse the ranked candidate feed and send pitches."}
          </p>

          <div
            className="flex flex-col gap-2 p-4"
            style={{
              border: "1px solid var(--border-soft)",
              borderRadius: "var(--r-lg)",
              background: "var(--surface-2)",
            }}
          >
            <span className="kicker">STARTER</span>
            <span className="mono tnum" style={{ fontSize: 16, color: "var(--text)", fontWeight: 600 }}>
              HKD 150 / MONTH
            </span>
            <p className="mono" style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>
              Browse the ranked candidate feed and send unlimited pitches.
            </p>
            <Button
              size="sm"
              className="mt-1"
              loading={loading}
              onClick={subscribe}
            >
              {status === "past_due" ? "RENEW" : "SUBSCRIBE"} →
            </Button>
          </div>

          {error && (
            <p className="mono" style={{ fontSize: 11, color: "var(--down)" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

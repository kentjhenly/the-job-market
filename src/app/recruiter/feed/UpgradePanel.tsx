"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { SubscriptionStatus, SubscriptionTier } from "@/lib/supabase/types";

interface Props {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
}

const TIERS = [
  {
    id: "starter" as const,
    label: "STARTER",
    price: "HKD 150 / MONTH",
    blurb: "Browse the ranked candidate feed and send unlimited pitches.",
  },
  {
    id: "pro" as const,
    label: "PRO",
    price: "HKD 4,000 / MONTH",
    blurb: "Everything in STARTER, plus priority placement in candidate match results.",
  },
];

export function UpgradePanel({ tier, status }: Props) {
  const [loading, setLoading] = useState<"starter" | "pro" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(selectedTier: "starter" | "pro") {
    setLoading(selectedTier);
    setError(null);
    const res = await fetch("/api/subscription/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: selectedTier }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "CHECKOUT FAILED");
      setLoading(null);
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
              : "An active subscription is required to browse the ranked candidate feed and send pitches. Choose a plan below to get started."}
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TIERS.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-2 p-4"
                style={{
                  border:
                    tier === t.id
                      ? "1px solid color-mix(in oklch, var(--gold) 40%, transparent)"
                      : "1px solid var(--border-soft)",
                  borderRadius: "var(--r-lg)",
                  background: tier === t.id ? "var(--gold-dim)" : "var(--surface-2)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="kicker">{t.label}</span>
                  {tier === t.id && <Badge variant="gold">CURRENT PLAN</Badge>}
                </div>
                <span className="mono tnum" style={{ fontSize: 16, color: "var(--text)", fontWeight: 600 }}>
                  {t.price}
                </span>
                <p className="mono" style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>
                  {t.blurb}
                </p>
                <Button
                  size="sm"
                  className="mt-1"
                  loading={loading === t.id}
                  disabled={loading !== null && loading !== t.id}
                  onClick={() => subscribe(t.id)}
                >
                  {tier === t.id ? "RENEW →" : "SELECT →"}
                </Button>
              </div>
            ))}
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

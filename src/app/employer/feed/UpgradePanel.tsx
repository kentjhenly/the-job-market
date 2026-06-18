import { Badge } from "@/components/ui/Badge";
import type { SubscriptionStatus, SubscriptionTier } from "@/lib/supabase/types";

interface Props {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
}

const TIERS = [
  {
    id: "starter",
    label: "STARTER",
    price: "HKD 150 / MONTH",
    blurb: "Browse the ranked candidate feed and send unlimited pitches.",
  },
  {
    id: "pro",
    label: "PRO",
    price: "HKD 4,000 / MONTH",
    blurb: "Everything in STARTER, plus priority placement in candidate match results.",
  },
] as const;

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "ACTIVE",
  past_due: "PAST DUE",
  canceled: "NO SUBSCRIPTION",
};

export function UpgradePanel({ tier, status }: Props) {
  return (
    <div className="view-enter space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="mono" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
            CANDIDATE FEED
          </h1>
          <p className="mono mt-0.5" style={{ fontSize: 11, color: "var(--muted)" }}>
            SUBSCRIPTION REQUIRED TO BROWSE
          </p>
        </div>
        <Badge variant={status === "past_due" ? "down" : "muted"}>{STATUS_LABEL[status]}</Badge>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">UPGRADE TO ACCESS THE FEED</span>
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
                {/* TODO(stripe): wire this button to create a Stripe Checkout
                    session for this tier, then redirect to the returned URL. */}
                <button type="button" className="btn btn-primary btn-sm mt-1" disabled>
                  {tier === t.id ? "RENEW →" : "SELECT →"}
                </button>
              </div>
            ))}
          </div>

          <p className="mono" style={{ fontSize: 10.5, color: "var(--dim)" }}>
            BILLING IS NOT YET LIVE · CONTACT THE TEAM TO ACTIVATE A PLAN MANUALLY
          </p>
        </div>
      </div>
    </div>
  );
}

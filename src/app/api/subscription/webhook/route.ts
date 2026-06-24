import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { SubscriptionStatus, SubscriptionTier } from "@/lib/supabase/types";

// Stripe needs the raw, unparsed request body to verify the webhook signature,
// so this route reads request.text() directly and never relies on JSON parsing.
export const dynamic = "force-dynamic";

// Map Stripe's subscription.status to our three-state employers.subscription_status.
function mapStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    default:
      // canceled, incomplete_expired, paused, etc.
      return "canceled";
  }
}

function mapTier(tier: string | undefined): SubscriptionTier {
  return tier === "starter" ? tier : "none";
}

async function syncSubscription(sub: Stripe.Subscription) {
  const employerId = sub.metadata?.employer_id;
  if (!employerId) return;

  const status = mapStatus(sub.status);
  const tier = status === "canceled" ? "none" : mapTier(sub.metadata?.tier);
  // In the dahlia API version current_period_end lives on the subscription
  // item, not the subscription object.
  const periodEndUnix = sub.items?.data?.[0]?.current_period_end;
  const periodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString().split("T")[0]
    : null;

  const supabase = getSupabaseServiceClient();
  await supabase
    .from("employers")
    .update({
      subscription_tier: tier,
      subscription_status: status,
      subscription_period_end: periodEnd,
    })
    .eq("id", employerId);
}

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET not configured in env" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();

  // Instantiate inside the handler (like /api/subscription/checkout): a
  // module-scope client throws at build time when the key is absent.
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-05-27.dahlia" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook verification failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      default:
        // Ignore unrelated events.
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

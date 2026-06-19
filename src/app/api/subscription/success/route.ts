import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!sessionId) {
    return NextResponse.redirect(new URL("/employer/feed", appUrl));
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.redirect(new URL("/employer/feed", appUrl));
  }

  try {
    // Instantiate inside the handler (like /api/subscription/checkout): a
    // module-scope client throws at build time when the key is absent, which
    // breaks `next build` while collecting page data for this route.
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-05-27.dahlia" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status !== "complete") {
      return NextResponse.redirect(new URL("/employer/feed", appUrl));
    }

    const employerId = session.metadata?.employer_id;
    const tier = session.metadata?.tier;
    if (!employerId || !tier) {
      return NextResponse.redirect(new URL("/employer/feed", appUrl));
    }

    const supabase = getSupabaseServiceClient();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await supabase
      .from("employers")
      .update({
        subscription_tier: tier as "starter" | "pro",
        subscription_status: "active",
        subscription_period_end: periodEnd.toISOString().split("T")[0],
      })
      .eq("id", employerId);

    return NextResponse.redirect(new URL("/employer/feed?subscribed=1", appUrl));
  } catch {
    return NextResponse.redirect(new URL("/employer/feed", appUrl));
  }
}

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "@/lib/auth/session";
import { parseBody } from "@/lib/utils/api";
import { checkoutSchema } from "@/lib/utils/schemas";

const PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
};

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "employer") {
    return NextResponse.json({ error: "Employers only" }, { status: 403 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not configured in env" }, { status: 500 });
  }

  const parsed = await parseBody(request, checkoutSchema);
  if (!parsed.ok) return parsed.response;
  const { tier } = parsed.data;

  const priceId = PRICE_IDS[tier];
  if (!priceId) {
    return NextResponse.json(
      { error: `STRIPE_PRICE_${tier.toUpperCase()} not configured in env` },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-05-27.dahlia",
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/api/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/employer/feed`,
      metadata: { employer_id: session.user.id, tier },
      subscription_data: { metadata: { employer_id: session.user.id, tier } },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

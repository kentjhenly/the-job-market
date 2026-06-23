import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { readColumnUpdate } from "@/lib/utils/matchReads";
import { serverError, parseBody } from "@/lib/utils/api";
import { offerSchema } from "@/lib/utils/schemas";

// Hire-offer flow, layered on top of an accepted match's chat:
//  - send     (employer)  — proposes a final salary, offer_status -> pending
//  - accept   (candidate) — confirms the hire, offer_status -> accepted, hired_at set
//  - renege   (candidate) — the candidate disapproves the offer, offer_status -> reneged
//  - withdraw (employer)  — the employer retracts their own pending offer, offer_status -> declined
// renege/withdraw both leave matches.status = 'accepted', so the chat stays open
// and the employer can send a fresh offer afterwards.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const parsed = await parseBody(request, offerSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const { action } = body;

  const supabase = getSupabaseServiceClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, employer_id, candidate_id, status, offer_status, offer_salary, hired_at")
    .eq("id", matchId)
    .or(`employer_id.eq.${session.user.id},candidate_id.eq.${session.user.id}`)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status !== "accepted") {
    return NextResponse.json({ error: "Chat is not active for this match" }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (action === "send") {
    if (match.employer_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the employer can send a hire offer" },
        { status: 403 }
      );
    }
    if (match.hired_at) {
      return NextResponse.json({ error: "This match is already hired" }, { status: 409 });
    }
    if (match.offer_status === "pending") {
      return NextResponse.json({ error: "An offer is already pending" }, { status: 409 });
    }

    const offeredSalary = Math.round(Number(body.offered_salary));
    if (!Number.isFinite(offeredSalary) || offeredSalary <= 0 || offeredSalary > 100_000_000) {
      return NextResponse.json(
        { error: "offered_salary must be a positive number within range" },
        { status: 400 }
      );
    }

    await supabase
      .from("matches")
      .update({
        offer_status: "pending",
        offer_salary: offeredSalary,
        offer_sent_at: now,
        last_message_at: now,
        ...readColumnUpdate(match, session.user.id, now),
      })
      .eq("id", matchId);

    const { data: message, error } = await supabase
      .from("match_messages")
      .insert({
        match_id: matchId,
        sender_id: session.user.id,
        body: JSON.stringify({ offered_salary: offeredSalary }),
        message_type: "offer",
      })
      .select("*")
      .single();

    if (error) return serverError("matches/offer", error);

    return NextResponse.json({ offer_status: "pending", message });
  }

  if (action === "withdraw") {
    // Employer retracts their own pending offer.
    if (match.employer_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the employer can withdraw a hire offer" },
        { status: 403 }
      );
    }
    if (match.offer_status !== "pending") {
      return NextResponse.json({ error: "No pending offer to withdraw" }, { status: 409 });
    }

    await supabase
      .from("matches")
      .update({ offer_status: "declined", last_message_at: now, ...readColumnUpdate(match, session.user.id, now) })
      .eq("id", matchId);

    const { data: message, error } = await supabase
      .from("match_messages")
      .insert({
        match_id: matchId,
        sender_id: session.user.id,
        body: JSON.stringify({ offered_salary: match.offer_salary }),
        message_type: "offer_declined",
      })
      .select("*")
      .single();

    if (error) return serverError("matches/offer", error);

    return NextResponse.json({ offer_status: "declined", message });
  }

  // accept / renege — candidate responding to a pending offer
  if (match.candidate_id !== session.user.id) {
    return NextResponse.json(
      { error: "Only the candidate can respond to a hire offer" },
      { status: 403 }
    );
  }
  if (match.offer_status !== "pending") {
    return NextResponse.json({ error: "No pending offer to respond to" }, { status: 409 });
  }

  if (action === "accept") {
    await supabase
      .from("matches")
      .update({
        offer_status: "accepted",
        hired_at: now,
        last_message_at: now,
        ...readColumnUpdate(match, session.user.id, now),
      })
      .eq("id", matchId);

    const { data: message, error } = await supabase
      .from("match_messages")
      .insert({
        match_id: matchId,
        sender_id: session.user.id,
        body: JSON.stringify({ offered_salary: match.offer_salary }),
        message_type: "offer_accepted",
      })
      .select("*")
      .single();

    if (error) return serverError("matches/offer", error);

    // A completed hire is the strongest positive reputation signal for both sides
    await supabase.from("reputation_events").insert([
      {
        subject_id: match.employer_id,
        actor_id: match.candidate_id,
        event_type: "completed_match",
        weight: 10,
        match_id: matchId,
      },
      {
        subject_id: match.candidate_id,
        actor_id: match.employer_id,
        event_type: "completed_match",
        weight: 10,
        match_id: matchId,
      },
    ]);

    return NextResponse.json({ offer_status: "accepted", message });
  }

  // renege — candidate disapproves the offer
  await supabase
    .from("matches")
    .update({ offer_status: "reneged", last_message_at: now, ...readColumnUpdate(match, session.user.id, now) })
    .eq("id", matchId);

  const { data: message, error } = await supabase
    .from("match_messages")
    .insert({
      match_id: matchId,
      sender_id: session.user.id,
      body: JSON.stringify({ offered_salary: match.offer_salary }),
      message_type: "offer_reneged",
    })
    .select("*")
    .single();

  if (error) return serverError("matches/offer renege", error);

  return NextResponse.json({ offer_status: "reneged", message });
}

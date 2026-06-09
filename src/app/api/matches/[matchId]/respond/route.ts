import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const { action } = await request.json();

  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action must be accept or decline" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  // Verify the candidate owns this match
  const { data: match } = await supabase
    .from("matches")
    .select("id, employer_id, candidate_id, status")
    .eq("id", matchId)
    .eq("candidate_id", session.user.id)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status !== "pending") {
    return NextResponse.json({ error: "Match is no longer pending" }, { status: 409 });
  }

  const newStatus = action === "accept" ? "accepted" : "declined";

  await supabase
    .from("matches")
    .update({ status: newStatus, responded_at: new Date().toISOString() })
    .eq("id", matchId);

  // Insert reputation event for employer (responded signal)
  await supabase.from("reputation_events").insert({
    subject_id: match.candidate_id,
    actor_id: match.employer_id,
    event_type: "responded",
    weight: 1,
    match_id: matchId,
  });

  // If accepted, insert match ticker event
  if (action === "accept") {
    await supabase.from("reputation_events").insert({
      subject_id: match.employer_id,
      actor_id: match.candidate_id,
      event_type: "completed_match",
      weight: 1,
      match_id: matchId,
    });

    await supabase.from("match_ticker_events").insert({
      vertical: "tech",
      role_label: "ENGINEER",
      match_type: "match",
    });
  }

  return NextResponse.json({ status: newStatus });
}

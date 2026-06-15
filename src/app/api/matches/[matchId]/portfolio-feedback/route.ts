import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

// Employer feedback on whether a candidate's portfolio accurately reflected
// their ability, captured once a match reaches "accepted". One rating per
// match — recommendation-scorer aggregates these per candidate as the
// portfolio_feedback signal.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const body = await request.json();
  const rating = Math.round(Number(body.rating));

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "rating must be an integer between 1 and 5" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, employer_id, candidate_id, status")
    .eq("id", matchId)
    .eq("employer_id", session.user.id)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status !== "accepted") {
    return NextResponse.json(
      { error: "Feedback is only available for accepted matches" },
      { status: 409 }
    );
  }

  const { data: feedback, error } = await supabase
    .from("portfolio_feedback")
    .insert({
      match_id: matchId,
      employer_id: match.employer_id,
      candidate_id: match.candidate_id,
      rating,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Feedback already submitted for this match" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feedback });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, employer_id, candidate_id")
    .eq("id", matchId)
    .or(`employer_id.eq.${session.user.id},candidate_id.eq.${session.user.id}`)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const { data: feedback } = await supabase
    .from("portfolio_feedback")
    .select("rating, created_at")
    .eq("match_id", matchId)
    .maybeSingle();

  return NextResponse.json({ feedback: feedback ?? null });
}

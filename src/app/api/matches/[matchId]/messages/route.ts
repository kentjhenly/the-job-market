import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

async function loadParticipantMatch(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  matchId: string,
  userId: string
) {
  const { data: match } = await supabase
    .from("matches")
    .select("id, employer_id, candidate_id, status")
    .eq("id", matchId)
    .or(`candidate_id.eq.${userId},employer_id.eq.${userId}`)
    .single();

  return match;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const supabase = getSupabaseServiceClient();

  const match = await loadParticipantMatch(supabase, matchId, session.user.id);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const { data: messages, error } = await supabase
    .from("match_messages")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: messages ?? [], currentUserId: session.user.id });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const { body } = await request.json();

  if (!body || !body.trim()) {
    return NextResponse.json({ error: "Message body required" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const match = await loadParticipantMatch(supabase, matchId, session.user.id);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "accepted") {
    return NextResponse.json({ error: "Chat is only available for accepted matches" }, { status: 409 });
  }

  const { data: message, error } = await supabase
    .from("match_messages")
    .insert({ match_id: matchId, sender_id: session.user.id, body: body.trim() })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message });
}

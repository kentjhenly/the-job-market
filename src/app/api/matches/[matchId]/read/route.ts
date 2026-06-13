import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { readColumnUpdate } from "@/lib/utils/matchReads";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, candidate_id, employer_id")
    .eq("id", matchId)
    .or(`candidate_id.eq.${session.user.id},employer_id.eq.${session.user.id}`)
    .single();

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  await supabase
    .from("matches")
    .update(readColumnUpdate(match, session.user.id, new Date().toISOString()))
    .eq("id", matchId);

  return NextResponse.json({ ok: true });
}

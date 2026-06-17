import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { CHAT_GHOST_HOURS } from "@/lib/utils/constants";

async function expirePendingPitches() {
  const supabase = getSupabaseServiceClient();

  const { data: expired, error } = await supabase
    .from("matches")
    .update({ status: "ghosted", responded_at: new Date().toISOString() })
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString())
    .select("id, employer_id, candidate_id");

  if (error) throw new Error(error.message);

  if (expired && expired.length > 0) {
    await supabase.from("reputation_events").insert(
      expired.map((m) => ({
        subject_id: m.candidate_id,
        actor_id: m.employer_id,
        event_type: "ghosted",
        weight: -15,
        match_id: m.id,
      }))
    );
  }

  return expired?.length ?? 0;
}

// Accepted matches (not yet hired) where neither side has messaged in
// CHAT_GHOST_HOURS — measured from the last message, or from responded_at
// if no message has ever been sent — are auto-ghosted. The party that did
// NOT send the most recent message is the one who went silent; with no
// messages at all, the employer (who sent the pitch) was expected to open
// the conversation first.
async function expireSilentChats() {
  const supabase = getSupabaseServiceClient();
  const cutoff = new Date(Date.now() - CHAT_GHOST_HOURS * 60 * 60 * 1000).toISOString();

  const [{ data: neverMessaged, error: e1 }, { data: wentQuiet, error: e2 }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, employer_id, candidate_id")
      .eq("status", "accepted")
      .is("hired_at", null)
      .is("last_message_at", null)
      .lt("responded_at", cutoff),
    supabase
      .from("matches")
      .select("id, employer_id, candidate_id")
      .eq("status", "accepted")
      .is("hired_at", null)
      .lt("last_message_at", cutoff),
  ]);

  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const stale = [...(neverMessaged ?? []), ...(wentQuiet ?? [])];
  if (stale.length === 0) return 0;

  for (const match of stale) {
    const { data: lastMessage } = await supabase
      .from("match_messages")
      .select("sender_id")
      .eq("match_id", match.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const silentIsEmployer = !lastMessage || lastMessage.sender_id !== match.employer_id;
    const subjectId = silentIsEmployer ? match.employer_id : match.candidate_id;
    const actorId = silentIsEmployer ? match.candidate_id : match.employer_id;

    await supabase.from("matches").update({ status: "ghosted" }).eq("id", match.id);

    await supabase.from("reputation_events").insert({
      subject_id: subjectId,
      actor_id: actorId,
      event_type: "ghosted",
      weight: -15,
      match_id: match.id,
    });
  }

  return stale.length;
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function run() {
  try {
    const [expiredPitches, ghostedChats] = await Promise.all([
      expirePendingPitches(),
      expireSilentChats(),
    ]);
    return NextResponse.json({ expired: expiredPitches, ghosted_chats: ghostedChats });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run();
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run();
}

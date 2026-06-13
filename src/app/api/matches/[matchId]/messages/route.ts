import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { readColumnUpdate } from "@/lib/utils/matchReads";
import { MAX_CHAT_FILE_SIZE_MB } from "@/lib/utils/constants";

async function loadParticipantMatch(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  matchId: string,
  userId: string
) {
  const { data: match } = await supabase
    .from("matches")
    .select(
      "id, employer_id, candidate_id, status, offer_status, offer_salary, offer_sent_at, hired_at, last_message_at, candidate_last_read_at, employer_last_read_at"
    )
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

  return NextResponse.json({ messages: messages ?? [], currentUserId: session.user.id, match });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const supabase = getSupabaseServiceClient();

  const match = await loadParticipantMatch(supabase, matchId, session.user.id);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.status !== "accepted") {
    return NextResponse.json({ error: "Chat is only available for accepted matches" }, { status: 409 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let message;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }
    if (file.size > MAX_CHAT_FILE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File must be under ${MAX_CHAT_FILE_SIZE_MB}MB` }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("match_messages")
      .insert({ match_id: matchId, sender_id: session.user.id, body: file.name, message_type: "file" })
      .select("*")
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    const filePath = `${matchId}/${inserted.id}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("match-files")
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: updated, error: updateError } = await supabase
      .from("match_messages")
      .update({ file_path: filePath, file_name: file.name, file_size: file.size })
      .eq("id", inserted.id)
      .select("*")
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    message = updated;
  } else {
    const { body } = await request.json();

    if (!body || !body.trim()) {
      return NextResponse.json({ error: "Message body required" }, { status: 400 });
    }

    const { data: inserted, error } = await supabase
      .from("match_messages")
      .insert({ match_id: matchId, sender_id: session.user.id, body: body.trim() })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    message = inserted;
  }

  const now = new Date().toISOString();
  await supabase
    .from("matches")
    .update({ last_message_at: now, ...readColumnUpdate(match, session.user.id, now) })
    .eq("id", matchId);

  return NextResponse.json({ message });
}

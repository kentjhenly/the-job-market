import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string; messageId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId, messageId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .or(`candidate_id.eq.${session.user.id},employer_id.eq.${session.user.id}`)
    .single();

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const { data: message, error } = await supabase
    .from("match_messages")
    .select("file_path")
    .eq("id", messageId)
    .eq("match_id", matchId)
    .single();

  if (error || !message?.file_path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: signed, error: signedError } = await supabase.storage
    .from("match-files")
    .createSignedUrl(message.file_path, 60);

  if (signedError || !signed) {
    return NextResponse.json({ error: "Could not generate file URL" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challengeId } = await params;
  const supabase = getSupabaseServiceClient();

  const [{ data: challenge }, { data: questions }] = await Promise.all([
    supabase.from("challenges").select("*").eq("id", challengeId).single(),
    supabase
      .from("questions")
      .select("id, type, prompt, options, weight, order_index")
      .eq("challenge_id", challengeId)
      .order("order_index"),
  ]);

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  return NextResponse.json({ challenge, questions: questions ?? [] });
}

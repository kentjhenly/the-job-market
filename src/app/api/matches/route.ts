import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "employer") {
    return NextResponse.json({ error: "Employers only" }, { status: 403 });
  }

  const { candidate_id, pitch_message, offered_salary } = await request.json();
  if (!candidate_id) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  // Check employer has credits
  const { data: employer } = await supabase
    .from("employers")
    .select("credits")
    .eq("id", session.user.id)
    .single();

  if (!employer || employer.credits < 1) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  // Create match (will fail on duplicate due to unique index)
  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      employer_id: session.user.id,
      candidate_id,
      pitch_message: pitch_message ?? null,
      offered_salary: offered_salary ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Already have an open pitch to this candidate" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Deduct credit
  await supabase
    .from("employers")
    .update({ credits: employer.credits - 1 })
    .eq("id", session.user.id);

  return NextResponse.json({ matchId: match.id });
}

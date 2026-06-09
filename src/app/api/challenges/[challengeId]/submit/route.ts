import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

interface SubmitBody {
  answers: Record<string, string>;
  time_taken_sec: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challengeId } = await params;
  const body: SubmitBody = await request.json();
  const supabase = getSupabaseServiceClient();

  // Fetch challenge and questions
  const [{ data: challenge }, { data: questions }] = await Promise.all([
    supabase.from("challenges").select("max_score").eq("id", challengeId).single(),
    supabase
      .from("questions")
      .select("id, correct_answer, weight, type")
      .eq("challenge_id", challengeId),
  ]);

  if (!challenge || !questions) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  // Score MCQ answers
  let earned = 0;
  let totalWeight = 0;

  for (const q of questions) {
    totalWeight += q.weight;
    if (q.type === "multiple_choice" && q.correct_answer) {
      if (body.answers[q.id] === q.correct_answer) {
        earned += q.weight;
      }
    }
    // coding/written questions scored as 0 for now (manual review or future LLM scoring)
  }

  const rawScore = totalWeight > 0 ? (earned / totalWeight) * challenge.max_score : 0;

  // Get attempt number
  const { data: existing } = await supabase
    .from("challenge_results")
    .select("attempt_number")
    .eq("candidate_id", session.user.id)
    .eq("challenge_id", challengeId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .single();

  const attemptNumber = (existing?.attempt_number ?? 0) + 1;

  // Insert result
  const { data: result, error } = await supabase
    .from("challenge_results")
    .insert({
      candidate_id: session.user.id,
      challenge_id: challengeId,
      raw_score: rawScore,
      time_taken_sec: body.time_taken_sec,
      answers: body.answers,
      attempt_number: attemptNumber,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire recommendation scorer Edge Function (non-blocking)
  const scorerUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/recommendation-scorer`;
  fetch(scorerUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ candidate_id: session.user.id }),
  }).catch(() => {
    // Non-blocking — scorer will retry via webhook if it fails
  });

  return NextResponse.json({ resultId: result.id, rawScore });
}

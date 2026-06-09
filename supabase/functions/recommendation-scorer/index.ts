import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEIGHTS = {
  challenge_score_avg: 0.4,
  challenge_recency: 0.1,
  challenge_speed: 0.05,
  challenge_breadth: 0.1,
  reputation_score: 0.2,
  response_rate: 0.1,
  profile_completeness: 0.05,
};

const DECAY_LAMBDA = 0.01; // per day

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { candidate_id } = await req.json();
  if (!candidate_id) {
    return new Response(JSON.stringify({ error: "candidate_id required" }), { status: 400 });
  }

  // Fetch all challenge results
  const { data: results } = await supabase
    .from("challenge_results")
    .select("raw_score, normalised_score, time_taken_sec, scored_at, challenge_id")
    .eq("candidate_id", candidate_id)
    .order("scored_at", { ascending: false });

  // Fetch candidate profile for completeness check
  const { data: candidate } = await supabase
    .from("candidates")
    .select("years_exp_claimed, location, desired_salary_min, desired_salary_max")
    .eq("id", candidate_id)
    .single();

  // Fetch reputation events
  const { data: repEvents } = await supabase
    .from("reputation_events")
    .select("event_type, weight, created_at")
    .eq("subject_id", candidate_id);

  // Fetch recent matches for response rate
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
  const { data: recentMatches } = await supabase
    .from("matches")
    .select("status, responded_at")
    .eq("candidate_id", candidate_id)
    .gte("created_at", thirtyDaysAgo);

  // --- Signal computations ---

  // 1. challenge_score_avg (0-1): average normalised score across all challenges
  const avgScore =
    results && results.length > 0
      ? results.reduce((sum, r) => sum + (r.raw_score ?? 0), 0) / results.length / 100
      : 0;

  // 2. challenge_recency (0-1): exponential time decay on most recent score
  let recencyScore = 0;
  if (results && results.length > 0) {
    const latest = results[0];
    const daysSince =
      (Date.now() - new Date(latest.scored_at).getTime()) / (1000 * 86400);
    recencyScore = (latest.raw_score ?? 0) / 100 * Math.exp(-DECAY_LAMBDA * daysSince);
  }

  // 3. challenge_speed (0-1): how fast compared to time limit
  // We don't have per-challenge time limits here, use a heuristic: under 50% of time = full score
  let speedScore = 0.5; // neutral default
  if (results && results.length > 0) {
    const avgTimeRatio =
      results
        .filter((r) => r.time_taken_sec)
        .reduce((sum, r) => sum + (r.time_taken_sec ?? 1800) / 1800, 0) / results.length;
    speedScore = Math.max(0, Math.min(1, 1 - avgTimeRatio));
  }

  // 4. challenge_breadth (0-1): distinct verticals covered (capped at 5 = full score)
  const distinctChallenges = new Set(results?.map((r) => r.challenge_id) ?? []).size;
  const breadthScore = Math.min(distinctChallenges / 5, 1);

  // 5. reputation_score (0-1): normalised from reputation_events sum
  let reputationScore = 1.0;
  if (repEvents && repEvents.length > 0) {
    const repSum = repEvents.reduce((sum, e) => {
      const w =
        e.event_type === "ghosted"
          ? -15
          : e.event_type === "responded"
            ? 5
            : e.event_type === "completed_match"
              ? 10
              : -10;
      return sum + w;
    }, 100);
    reputationScore = Math.max(0, Math.min(100, repSum)) / 100;
  }

  // 6. response_rate (0-1): responded matches / total received (last 30 days)
  let responseRate = 0.5;
  if (recentMatches && recentMatches.length > 0) {
    const responded = recentMatches.filter(
      (m) => m.status === "accepted" || m.status === "declined"
    ).length;
    responseRate = responded / recentMatches.length;
  }

  // 7. profile_completeness (0-1)
  const completenessFields = [
    candidate?.years_exp_claimed != null,
    candidate?.location != null,
    candidate?.desired_salary_min != null,
    candidate?.desired_salary_max != null,
  ];
  const completenessScore = completenessFields.filter(Boolean).length / completenessFields.length;

  // Weighted composite score (0-100)
  const composite =
    (avgScore * WEIGHTS.challenge_score_avg +
      recencyScore * WEIGHTS.challenge_recency +
      speedScore * WEIGHTS.challenge_speed +
      breadthScore * WEIGHTS.challenge_breadth +
      reputationScore * WEIGHTS.reputation_score +
      responseRate * WEIGHTS.response_rate +
      completenessScore * WEIGHTS.profile_completeness) *
    100;

  // Compute percentile rank
  const { count: totalCandidates } = await supabase
    .from("candidates")
    .select("id", { count: "exact", head: true });

  const { count: belowCount } = await supabase
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .lt("composite_score", composite);

  const percentileRank =
    totalCandidates && totalCandidates > 1
      ? ((belowCount ?? 0) / (totalCandidates - 1)) * 100
      : 50;

  // Update candidate record
  await supabase
    .from("candidates")
    .update({ composite_score: composite, percentile_rank: percentileRank })
    .eq("id", candidate_id);

  // Record score history
  await supabase.from("score_history").insert({
    candidate_id,
    composite_score: composite,
  });

  const signals = {
    challenge_score_avg: avgScore,
    challenge_recency: recencyScore,
    challenge_speed: speedScore,
    challenge_breadth: breadthScore,
    reputation_score: reputationScore,
    response_rate: responseRate,
    profile_completeness: completenessScore,
  };

  return new Response(
    JSON.stringify({ composite_score: composite, percentile_rank: percentileRank, signals }),
    { headers: { "Content-Type": "application/json" } }
  );
});

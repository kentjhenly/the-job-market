import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEIGHTS = {
  portfolio_breadth: 0.2,
  portfolio_skill_coverage: 0.25,
  portfolio_completeness: 0.1,
  portfolio_feedback: 0.1,
  reputation_score: 0.2,
  response_rate: 0.1,
  profile_completeness: 0.05,
};

const BREADTH_TARGET = 5; // project count for full breadth score
const SKILL_COVERAGE_TARGET = 10; // distinct skills for full coverage score

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST" },
    });
  }

  // Service-role-only. The gateway's default verify_jwt accepts the public anon
  // key (shipped in the browser bundle), so we also require the service-role key
  // here; config.toml sets verify_jwt = false to skip the redundant gateway check.
  if (req.headers.get("Authorization") !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
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

  // Fetch all portfolio projects
  const { data: projects } = await supabase
    .from("candidate_portfolio_projects")
    .select("skills, file_path, link_url")
    .eq("candidate_id", candidate_id);

  // Fetch candidate profile for completeness check. Location / salary / work
  // mode now live per-position on candidate_job_postings (set in the candidate's
  // postings, not the profile), so completeness counts having a posting rather
  // than profile-level salary/location fields.
  const { data: candidate } = await supabase
    .from("candidates")
    .select("years_exp_claimed")
    .eq("id", candidate_id)
    .single();

  const { count: postingCount } = await supabase
    .from("candidate_job_postings")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidate_id);

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

  // Fetch employer ratings of portfolio accuracy
  const { data: feedbackRows } = await supabase
    .from("portfolio_feedback")
    .select("rating")
    .eq("candidate_id", candidate_id);

  // --- Signal computations ---

  // 1. portfolio_breadth (0-1): project count, capped at BREADTH_TARGET
  const projectCount = projects?.length ?? 0;
  const breadthScore = Math.min(projectCount / BREADTH_TARGET, 1);

  // 2. portfolio_skill_coverage (0-1): distinct skills across projects, capped at SKILL_COVERAGE_TARGET
  const distinctSkills = new Set((projects ?? []).flatMap((p) => p.skills ?? [])).size;
  const skillCoverageScore = Math.min(distinctSkills / SKILL_COVERAGE_TARGET, 1);

  // 3. portfolio_completeness (0-1): avg per-project (has file/link + has skills)
  let completenessScore = 0;
  if (projects && projects.length > 0) {
    const total = projects.reduce((sum, p) => {
      const hasArtifact = p.file_path || p.link_url ? 0.5 : 0;
      const hasSkills = p.skills && p.skills.length > 0 ? 0.5 : 0;
      return sum + hasArtifact + hasSkills;
    }, 0);
    completenessScore = total / projects.length;
  }

  // 4. reputation_score (0-1): normalised from reputation_events sum
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

  // 5. response_rate (0-1): responded matches / total received (last 30 days)
  let responseRate = 0.5;
  if (recentMatches && recentMatches.length > 0) {
    const responded = recentMatches.filter(
      (m) => m.status === "accepted" || m.status === "declined"
    ).length;
    responseRate = responded / recentMatches.length;
  }

  // 6. profile_completeness (0-1)
  const profileFields = [
    candidate?.years_exp_claimed != null,
    (postingCount ?? 0) > 0,
  ];
  const profileCompletenessScore = profileFields.filter(Boolean).length / profileFields.length;

  // 7. portfolio_feedback (0-1): avg employer rating (1-5) of "did the
  // portfolio accurately reflect this candidate's ability", normalised.
  // Neutral 0.5 default until an employer has rated this candidate.
  let portfolioFeedbackScore = 0.5;
  if (feedbackRows && feedbackRows.length > 0) {
    const avgRating = feedbackRows.reduce((sum, f) => sum + f.rating, 0) / feedbackRows.length;
    portfolioFeedbackScore = (avgRating - 1) / 4;
  }

  // Weighted composite score (0-100)
  const composite =
    (breadthScore * WEIGHTS.portfolio_breadth +
      skillCoverageScore * WEIGHTS.portfolio_skill_coverage +
      completenessScore * WEIGHTS.portfolio_completeness +
      portfolioFeedbackScore * WEIGHTS.portfolio_feedback +
      reputationScore * WEIGHTS.reputation_score +
      responseRate * WEIGHTS.response_rate +
      profileCompletenessScore * WEIGHTS.profile_completeness) *
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
    portfolio_breadth: breadthScore,
    portfolio_skill_coverage: skillCoverageScore,
    portfolio_completeness: completenessScore,
    portfolio_feedback: portfolioFeedbackScore,
    reputation_score: reputationScore,
    response_rate: responseRate,
    profile_completeness: profileCompletenessScore,
  };

  return new Response(
    JSON.stringify({ composite_score: composite, percentile_rank: percentileRank, signals }),
    { headers: { "Content-Type": "application/json" } }
  );
});

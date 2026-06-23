import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEIGHTS = {
  portfolio_quality: 0.25,
  portfolio_skill_coverage: 0.25,
  portfolio_feedback: 0.1,
  reputation_score: 0.25,
  demand_alignment: 0.1,
  profile_completeness: 0.05,
};

const QUALITY_PROJECT_TARGET = 5;
const SKILL_COVERAGE_TARGET = 10;
const DEMAND_SKILL_TARGET = 5;

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

  // Fetch employer ratings of portfolio accuracy
  const { data: feedbackRows } = await supabase
    .from("portfolio_feedback")
    .select("rating")
    .eq("candidate_id", candidate_id);

  // Fetch open employer postings and all portfolio projects for demand alignment
  const { data: employerPostings } = await supabase
    .from("employer_job_postings")
    .select("skills")
    .eq("status", "open");

  const { data: allPortfolioProjects } = await supabase
    .from("candidate_portfolio_projects")
    .select("skills, candidate_id");

  // --- Signal computations ---

  // 1. portfolio_quality (0-1): merges breadth + completeness.
  // breadth = min(projects / target, 1), completeness = avg per-project score.
  // Combined as 50/50 blend.
  const projectCount = projects?.length ?? 0;
  const breadthRaw = Math.min(projectCount / QUALITY_PROJECT_TARGET, 1);
  let completenessRaw = 0;
  if (projects && projects.length > 0) {
    const total = projects.reduce((sum, p) => {
      const hasArtifact = p.file_path || p.link_url ? 0.5 : 0;
      const hasSkills = p.skills && p.skills.length > 0 ? 0.5 : 0;
      return sum + hasArtifact + hasSkills;
    }, 0);
    completenessRaw = total / projects.length;
  }
  const portfolioQualityScore = breadthRaw * 0.5 + completenessRaw * 0.5;

  // 2. portfolio_skill_coverage (0-1): distinct skills across projects, capped at SKILL_COVERAGE_TARGET
  const candidateSkills = new Set((projects ?? []).flatMap((p) => (p.skills ?? []).map((s: string) => s.toLowerCase())));
  const skillCoverageScore = Math.min(candidateSkills.size / SKILL_COVERAGE_TARGET, 1);

  // 3. demand_alignment (0-1): demand/supply ratio scoring.
  // For each skill on the platform, demand = number of open postings requesting
  // it, supply = number of distinct candidates who have it. Each of the
  // candidate's skills earns demand/supply points. The candidate's raw total is
  // normalised against the platform median candidate's total so that 1.0 = the
  // median candidate's market alignment, >1 = above average, capped at 1.
  const skillDemandCount = new Map<string, number>();
  for (const p of employerPostings ?? []) {
    for (const s of p.skills ?? []) {
      const k = s.toLowerCase();
      skillDemandCount.set(k, (skillDemandCount.get(k) ?? 0) + 1);
    }
  }
  const skillSupplyCount = new Map<string, Set<string>>();
  for (const p of allPortfolioProjects ?? []) {
    for (const s of p.skills ?? []) {
      const k = (s as string).toLowerCase();
      const ids = skillSupplyCount.get(k) ?? new Set<string>();
      ids.add(p.candidate_id);
      skillSupplyCount.set(k, ids);
    }
  }

  let demandAlignmentScore = 0;
  if (candidateSkills.size > 0 && skillDemandCount.size > 0) {
    const dsRatio = (skill: string) => {
      const demand = skillDemandCount.get(skill) ?? 0;
      const supply = Math.max(1, skillSupplyCount.get(skill)?.size ?? 0);
      return demand / supply;
    };
    const candidateTotal = [...candidateSkills].reduce((sum, s) => sum + dsRatio(s), 0);

    // Compute every candidate's total to find the median for normalisation
    const byCandId = new Map<string, Set<string>>();
    for (const p of allPortfolioProjects ?? []) {
      const skills = byCandId.get(p.candidate_id) ?? new Set<string>();
      for (const s of p.skills ?? []) skills.add((s as string).toLowerCase());
      byCandId.set(p.candidate_id, skills);
    }
    const allTotals = [...byCandId.values()]
      .map((skills) => [...skills].reduce((sum, s) => sum + dsRatio(s), 0))
      .sort((a, b) => a - b);
    const medianTotal = allTotals.length > 0
      ? allTotals[Math.floor(allTotals.length / 2)]
      : 1;
    const norm = Math.max(medianTotal, 0.01);
    demandAlignmentScore = Math.min(candidateTotal / norm, 1);
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

  // 5. profile_completeness (0-1)
  const profileFields = [
    candidate?.years_exp_claimed != null,
    (postingCount ?? 0) > 0,
  ];
  const profileCompletenessScore = profileFields.filter(Boolean).length / profileFields.length;

  // 6. portfolio_feedback (0-1): avg employer rating (1-5), normalised.
  // Starts at 1.0 (perfect); drops to the actual mean once feedback arrives.
  let portfolioFeedbackScore = 1.0;
  if (feedbackRows && feedbackRows.length > 0) {
    const avgRating = feedbackRows.reduce((sum, f) => sum + f.rating, 0) / feedbackRows.length;
    portfolioFeedbackScore = (avgRating - 1) / 4;
  }

  // Weighted composite score (0-100)
  const composite =
    (portfolioQualityScore * WEIGHTS.portfolio_quality +
      skillCoverageScore * WEIGHTS.portfolio_skill_coverage +
      portfolioFeedbackScore * WEIGHTS.portfolio_feedback +
      reputationScore * WEIGHTS.reputation_score +
      demandAlignmentScore * WEIGHTS.demand_alignment +
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
    portfolio_quality: portfolioQualityScore,
    portfolio_skill_coverage: skillCoverageScore,
    portfolio_feedback: portfolioFeedbackScore,
    reputation_score: reputationScore,
    demand_alignment: demandAlignmentScore,
    profile_completeness: profileCompletenessScore,
  };

  return new Response(
    JSON.stringify({ composite_score: composite, percentile_rank: percentileRank, signals }),
    { headers: { "Content-Type": "application/json" } }
  );
});

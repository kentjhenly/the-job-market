import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const QUALITY_PROJECT_TARGET = 5;
const SKILL_COVERAGE_TARGET = 10;
const DEMAND_SKILL_TARGET = 5;

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServiceClient();
  const candidateId = session.user.id;

  const [
    { data: candidate },
    { data: scoreHistory },
    { data: projects },
    { data: repEvents },
    { data: feedbackRows },
    { data: employerPostings },
    { data: allPortfolioProjects },
  ] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", candidateId).single(),
    supabase
      .from("score_history")
      .select("composite_score, recorded_at")
      .eq("candidate_id", candidateId)
      .order("recorded_at", { ascending: false })
      .limit(30),
    supabase
      .from("candidate_portfolio_projects")
      .select("skills, file_path, link_url")
      .eq("candidate_id", candidateId),
    supabase
      .from("reputation_events")
      .select("event_type, weight, created_at")
      .eq("subject_id", candidateId),
    supabase.from("portfolio_feedback").select("rating").eq("candidate_id", candidateId),
    supabase.from("employer_job_postings").select("skills").eq("status", "open"),
    supabase.from("candidate_portfolio_projects").select("skills, candidate_id"),
  ]);

  // portfolio_quality (0-1): merges breadth + completeness (50/50)
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

  // portfolio_skill_coverage (0-1)
  const candidateSkills = new Set((projects ?? []).flatMap((p) => (p.skills ?? []).map((s: string) => s.toLowerCase())));
  const skillCoverageScore = Math.min(candidateSkills.size / SKILL_COVERAGE_TARGET, 1);

  // demand_alignment (0-1): demand/supply ratio scoring.
  // Each candidate skill earns (postings wanting it / candidates who have it).
  // Normalised against the platform median so 1.0 = median market alignment.
  const skillDemandCount = new Map<string, number>();
  for (const p of employerPostings ?? []) {
    for (const s of (p.skills ?? []) as string[]) {
      const k = s.toLowerCase();
      skillDemandCount.set(k, (skillDemandCount.get(k) ?? 0) + 1);
    }
  }
  const skillSupplyCount = new Map<string, Set<string>>();
  for (const p of allPortfolioProjects ?? []) {
    for (const s of (p.skills ?? []) as string[]) {
      const k = s.toLowerCase();
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

    const byCandId = new Map<string, Set<string>>();
    for (const p of allPortfolioProjects ?? []) {
      const skills = byCandId.get(p.candidate_id) ?? new Set<string>();
      for (const s of (p.skills ?? []) as string[]) skills.add(s.toLowerCase());
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

  // reputation_score (0-1): normalised from reputation_events sum
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
              : e.event_type === "reneged"
                ? 0
                : -10;
      return sum + w;
    }, 100);
    reputationScore = Math.max(0, Math.min(100, repSum)) / 100;
  }

  // profile_completeness (0-1)
  const { count: postingCount } = await supabase
    .from("candidate_job_postings")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidateId);
  const profileFields = [
    candidate?.years_exp_claimed != null,
    (postingCount ?? 0) > 0,
  ];
  const profileCompletenessScore = profileFields.filter(Boolean).length / profileFields.length;

  // portfolio_feedback (0-1): avg employer rating (1-5), normalised.
  // 1.0 (perfect) until an employer has rated this candidate.
  let portfolioFeedbackScore = 1.0;
  if (feedbackRows && feedbackRows.length > 0) {
    const avgRating = feedbackRows.reduce((sum, f) => sum + f.rating, 0) / feedbackRows.length;
    portfolioFeedbackScore = (avgRating - 1) / 4;
  }

  const signals = {
    portfolio_quality: portfolioQualityScore,
    portfolio_skill_coverage: skillCoverageScore,
    portfolio_feedback: portfolioFeedbackScore,
    reputation_score: reputationScore,
    demand_alignment: demandAlignmentScore,
    profile_completeness: profileCompletenessScore,
  };

  const WEIGHTS: Record<string, number> = {
    portfolio_quality: 0.25,
    portfolio_skill_coverage: 0.25,
    portfolio_feedback: 0.10,
    reputation_score: 0.25,
    demand_alignment: 0.10,
    profile_completeness: 0.05,
  };
  const computedScore = Math.round(
    Object.entries(signals).reduce((sum, [k, v]) => sum + v * (WEIGHTS[k] ?? 0), 0) * 1000
  ) / 10;

  const lastRecorded = scoreHistory?.[0]?.composite_score;
  const changed = lastRecorded == null || Math.abs(computedScore - lastRecorded) >= 0.1;

  let updatedCandidate = candidate;
  let updatedHistory = scoreHistory ?? [];

  if (changed) {
    const { count: totalVisible } = await supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .eq("is_visible", true);

    const { count: belowCount } = await supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .eq("is_visible", true)
      .lt("composite_score", computedScore);

    const percentileRank = totalVisible && totalVisible > 0
      ? Math.round(((belowCount ?? 0) / totalVisible) * 100)
      : 0;

    const { data: updated } = await supabase
      .from("candidates")
      .update({ composite_score: computedScore, percentile_rank: percentileRank })
      .eq("id", candidateId)
      .select("*")
      .single();

    if (updated) updatedCandidate = updated;

    await supabase.from("score_history").insert({
      candidate_id: candidateId,
      composite_score: computedScore,
    });

    const { data: freshHistory } = await supabase
      .from("score_history")
      .select("composite_score, recorded_at")
      .eq("candidate_id", candidateId)
      .order("recorded_at", { ascending: false })
      .limit(30);

    if (freshHistory) updatedHistory = freshHistory;
  }

  return NextResponse.json({ candidate: updatedCandidate, scoreHistory: updatedHistory, signals });
}

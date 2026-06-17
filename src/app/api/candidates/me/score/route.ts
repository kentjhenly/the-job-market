import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

// Mirrors the signal formulas in supabase/functions/recommendation-scorer/index.ts
// (read-only — does not recompute composite_score or write any rows) so the
// dashboard's WAYS TO IMPROVE panel reflects the same breakdown the scorer uses.
const BREADTH_TARGET = 5;
const SKILL_COVERAGE_TARGET = 10;

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServiceClient();
  const candidateId = session.user.id;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

  const [
    { data: candidate },
    { data: scoreHistory },
    { data: projects },
    { data: repEvents },
    { data: recentMatches },
    { data: feedbackRows },
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
    supabase
      .from("matches")
      .select("status, responded_at")
      .eq("candidate_id", candidateId)
      .gte("created_at", thirtyDaysAgo),
    supabase.from("portfolio_feedback").select("rating").eq("candidate_id", candidateId),
  ]);

  // portfolio_breadth (0-1): project count, capped at BREADTH_TARGET
  const projectCount = projects?.length ?? 0;
  const breadthScore = Math.min(projectCount / BREADTH_TARGET, 1);

  // portfolio_skill_coverage (0-1): distinct skills across projects, capped at SKILL_COVERAGE_TARGET
  const distinctSkills = new Set((projects ?? []).flatMap((p) => p.skills ?? [])).size;
  const skillCoverageScore = Math.min(distinctSkills / SKILL_COVERAGE_TARGET, 1);

  // portfolio_completeness (0-1): avg per-project (has file/link + has skills)
  let completenessScore = 0;
  if (projects && projects.length > 0) {
    const total = projects.reduce((sum, p) => {
      const hasArtifact = p.file_path || p.link_url ? 0.5 : 0;
      const hasSkills = p.skills && p.skills.length > 0 ? 0.5 : 0;
      return sum + hasArtifact + hasSkills;
    }, 0);
    completenessScore = total / projects.length;
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
              : -10;
      return sum + w;
    }, 100);
    reputationScore = Math.max(0, Math.min(100, repSum)) / 100;
  }

  // response_rate (0-1): responded matches / total received (last 30 days)
  let responseRate = 0.5;
  if (recentMatches && recentMatches.length > 0) {
    const responded = recentMatches.filter(
      (m) => m.status === "accepted" || m.status === "declined"
    ).length;
    responseRate = responded / recentMatches.length;
  }

  // profile_completeness (0-1)
  const profileFields = [
    candidate?.years_exp_claimed != null,
    candidate?.location != null,
    candidate?.desired_salary_min != null,
    candidate?.desired_salary_max != null,
  ];
  const profileCompletenessScore = profileFields.filter(Boolean).length / profileFields.length;

  // portfolio_feedback (0-1): avg employer rating (1-5), normalised. Neutral
  // 0.5 default until an employer has rated this candidate.
  let portfolioFeedbackScore = 0.5;
  if (feedbackRows && feedbackRows.length > 0) {
    const avgRating = feedbackRows.reduce((sum, f) => sum + f.rating, 0) / feedbackRows.length;
    portfolioFeedbackScore = (avgRating - 1) / 4;
  }

  const signals = {
    portfolio_breadth: breadthScore,
    portfolio_skill_coverage: skillCoverageScore,
    portfolio_completeness: completenessScore,
    portfolio_feedback: portfolioFeedbackScore,
    reputation_score: reputationScore,
    response_rate: responseRate,
    profile_completeness: profileCompletenessScore,
  };

  return NextResponse.json({ candidate, scoreHistory: scoreHistory ?? [], signals });
}

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";

import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) return null;

  const supabase = getSupabaseServiceClient();

  const [
    { data: candidate },
    { data: profile },
    { data: projects },
    { data: scoreHistory },
    { count: totalVisible },
    { data: postings },
    { data: allMatches },
    { data: openPostings },
    { data: allPortfolioProjects },
  ] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", session.user.id).single(),
    supabase.from("profiles").select("display_name").eq("id", session.user.id).single(),
    supabase
      .from("candidate_portfolio_projects")
      .select("id, title, skills, file_path, link_url, created_at")
      .eq("candidate_id", session.user.id)
      .then((res) => ({
        ...res,
        data: res.data?.map(({ file_path, ...rest }) => ({ ...rest, has_file: file_path != null })),
      })),
    supabase
      .from("score_history")
      .select("composite_score, recorded_at")
      .eq("candidate_id", session.user.id)
      .order("recorded_at", { ascending: false })
      .limit(30),
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("is_visible", true),
    supabase
      .from("candidate_job_postings")
      .select("title, location, work_modes, desired_salary_min, desired_salary_max")
      .eq("candidate_id", session.user.id)
      .order("created_at", { ascending: true }),
    // Full pitch history for the funnel, pending-expiry callout, and offer book
    supabase
      .from("matches")
      .select("status, expires_at, offered_salary, candidate_last_read_at, hired_at")
      .eq("candidate_id", session.user.id),
    // Open employer roles drive the skill demand heatmap
    supabase.from("employer_job_postings").select("skills, title").eq("status", "open"),
    // All visible candidates' portfolio skills for supply-side of the heatmap
    supabase.from("candidate_portfolio_projects").select("skills, candidate_id"),
  ]);

  // Location / salary / work-mode now live on the candidate's postings (set per
  // position), so summarize them here for the dashboard rather than the profile.
  const salaryMins = (postings ?? []).map((p) => p.desired_salary_min).filter((v): v is number => v != null);
  const salaryMaxes = (postings ?? []).map((p) => p.desired_salary_max).filter((v): v is number => v != null);
  const postingSummary = {
    count: postings?.length ?? 0,
    location: (postings ?? []).find((p) => p.location)?.location ?? null,
    salaryMin: salaryMins.length ? Math.min(...salaryMins) : null,
    salaryMax: salaryMaxes.length ? Math.max(...salaryMaxes) : null,
    remote: (postings ?? []).some((p) => p.work_modes?.includes("remote")),
  };

  // Pitch funnel + soonest pending expiry (72h rule) for the awaiting-response callout.
  const matchesList = allMatches ?? [];
  const pendingExpiries = matchesList
    .filter((m) => m.status === "pending" && m.expires_at)
    .map((m) => m.expires_at as string)
    .sort();
  const pitchStats = {
    received: matchesList.length,
    reviewed: matchesList.filter((m) => m.candidate_last_read_at != null).length,
    pending: matchesList.filter((m) => m.status === "pending").length,
    accepted: matchesList.filter((m) => m.hired_at != null).length,
    declined: matchesList.filter((m) => m.status === "declined").length,
    ghosted: matchesList.filter((m) => m.status === "ghosted").length,
    nextExpiry: pendingExpiries[0] ?? null,
  };

  // SKILL DEMAND heatmap -- colors reflect market supply: demand/supply ratio per
  // cell (open roles wanting the skill vs. distinct candidates who have it).
  // High ratio = scarce skill (hot/gold), low ratio = oversupplied (cold/olive).
  const candidateSkillKeys = new Set(
    (projects ?? []).flatMap((p) => p.skills).map((s) => s.toLowerCase())
  );
  // Supply: count distinct candidates per skill (across all portfolios).
  const skillSupply = new Map<string, number>();
  const seen = new Map<string, Set<string>>();
  for (const proj of allPortfolioProjects ?? []) {
    for (const skill of proj.skills ?? []) {
      const key = skill.toLowerCase();
      const ids = seen.get(key) ?? new Set<string>();
      if (!ids.has(proj.candidate_id)) {
        ids.add(proj.candidate_id);
        seen.set(key, ids);
        skillSupply.set(key, (skillSupply.get(key) ?? 0) + 1);
      }
    }
  }
  // Demand: open employer roles per skill per role title.
  const cellDemand = new Map<string, Map<string, number>>();
  const skillTotal = new Map<string, { label: string; total: number }>();
  const roleSet = new Set<string>();
  for (const post of openPostings ?? []) {
    const role = (post.title ?? "").toUpperCase();
    if (role) roleSet.add(role);
    for (const skill of post.skills ?? []) {
      const key = skill.toLowerCase();
      const byRole = cellDemand.get(key) ?? new Map<string, number>();
      byRole.set(role, (byRole.get(role) ?? 0) + 1);
      cellDemand.set(key, byRole);
      const st = skillTotal.get(key) ?? { label: skill, total: 0 };
      st.total++;
      skillTotal.set(key, st);
    }
  }
  const rankedSkills = [...skillTotal.entries()].sort((a, b) => b[1].total - a[1].total);
  let rowKeys = rankedSkills.filter(([k]) => candidateSkillKeys.has(k)).slice(0, 6).map(([k]) => k);
  if (rowKeys.length === 0) rowKeys = rankedSkills.slice(0, 6).map(([k]) => k);
  const colTotals = new Map<string, number>();
  for (const k of rowKeys) {
    for (const [role, n] of cellDemand.get(k) ?? []) {
      colTotals.set(role, (colTotals.get(role) ?? 0) + n);
    }
  }
  const colRoles = [...colTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([r]) => r);
  const skillDemand = {
    skills: rowKeys.map((k) => skillTotal.get(k)!.label),
    categories: colRoles,
    openings: (openPostings ?? []).length,
    cells: rowKeys.map((k) =>
      colRoles.map((r) => {
        const demand = cellDemand.get(k)?.get(r) ?? 0;
        const supply = Math.max(1, skillSupply.get(k) ?? 0);
        return Math.round((demand / supply) * 10) / 10;
      })
    ),
  };

  // Compute platform-average signals for the radar's "mean" overlay.
  // Uses the same demand/supply ratio formula as the scorer: per-skill
  // demand (postings) / supply (candidates), summed per candidate,
  // normalised against the platform median.
  const QUALITY_PROJECT_TARGET = 5;
  const SKILL_COVERAGE_TARGET_PAGE = 10;

  // Build demand/supply maps
  const pgSkillDemand = new Map<string, number>();
  for (const p of openPostings ?? []) {
    for (const s of (p.skills ?? []) as string[]) {
      const k = s.toLowerCase();
      pgSkillDemand.set(k, (pgSkillDemand.get(k) ?? 0) + 1);
    }
  }
  const pgSkillSupply = new Map<string, Set<string>>();
  const byCandidateMap = new Map<string, { skills: string[]; candidate_id: string }[]>();
  for (const proj of allPortfolioProjects ?? []) {
    const arr = byCandidateMap.get(proj.candidate_id) ?? [];
    arr.push(proj);
    byCandidateMap.set(proj.candidate_id, arr);
    for (const s of (proj.skills ?? []) as string[]) {
      const k = s.toLowerCase();
      const ids = pgSkillSupply.get(k) ?? new Set<string>();
      ids.add(proj.candidate_id);
      pgSkillSupply.set(k, ids);
    }
  }
  const dsRatio = (skill: string) => {
    const demand = pgSkillDemand.get(skill) ?? 0;
    const supply = Math.max(1, pgSkillSupply.get(skill)?.size ?? 0);
    return demand / supply;
  };

  // Per-candidate D/S totals for median normalisation
  const candDsTotals: number[] = [];
  let sumQuality = 0, sumCoverage = 0;
  const candidateCount = byCandidateMap.size || 1;
  for (const [, projs] of byCandidateMap) {
    const n = projs.length;
    const breadth = Math.min(n / QUALITY_PROJECT_TARGET, 1);
    const compl = n > 0 ? projs.reduce((s, p) => s + ((p.skills?.length ?? 0) > 0 ? 0.5 : 0) + 0.5, 0) / n : 0;
    sumQuality += breadth * 0.5 + compl * 0.5;
    const skills = new Set(projs.flatMap((p) => ((p.skills ?? []) as string[]).map((s) => s.toLowerCase())));
    sumCoverage += Math.min(skills.size / SKILL_COVERAGE_TARGET_PAGE, 1);
    const total = [...skills].reduce((sum, s) => sum + dsRatio(s), 0);
    candDsTotals.push(total);
  }
  candDsTotals.sort((a, b) => a - b);
  const medianDs = candDsTotals.length > 0
    ? candDsTotals[Math.floor(candDsTotals.length / 2)]
    : 1;
  const dsNorm = Math.max(medianDs, 0.01);
  const sumDemand = candDsTotals.reduce(
    (sum, t) => sum + Math.min(t / dsNorm, 1), 0
  );

  const avgSignals = {
    portfolio_quality: sumQuality / candidateCount,
    portfolio_skill_coverage: sumCoverage / candidateCount,
    portfolio_feedback: 1.0,
    reputation_score: 1.0,
    demand_alignment: sumDemand / candidateCount,
  };

  return (
    <DashboardClient
      candidateId={session.user.id}
      candidate={candidate}
      profile={profile}
      postingSummary={postingSummary}
      pitchStats={pitchStats}
      skillDemand={skillDemand}
      projects={projects ?? []}
      scoreHistory={scoreHistory ?? []}
      totalVisible={totalVisible ?? 0}
      avgSignals={avgSignals}
    />
  );
}

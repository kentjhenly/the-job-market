import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { verticalLabel, type VerticalType } from "@/lib/utils/constants";
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
      .select("status, expires_at, offered_salary, candidate_last_read_at")
      .eq("candidate_id", session.user.id),
    // Open employer roles drive the "in-demand skills" gap; vertical-filtered below
    supabase.from("employer_job_postings").select("skills, vertical").eq("status", "open"),
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
    accepted: matchesList.filter((m) => m.status === "accepted").length,
    declined: matchesList.filter((m) => m.status === "declined").length,
    ghosted: matchesList.filter((m) => m.status === "ghosted").length,
    nextExpiry: pendingExpiries[0] ?? null,
  };

  // SKILL DEMAND heatmap — across every open employer role, count how many in
  // each vertical ask for each skill (skill × industry matrix). Rows lead with
  // the candidate's own portfolio skills ("where your skills sell"); if none of
  // those are in demand we fall back to the market's top in-demand skills so the
  // panel still has signal. Columns are the verticals with the most demand for
  // the chosen rows. Cross-vertical on purpose — we want to show where a skill
  // sells, not just the candidate's own verticals.
  const candidateSkillKeys = new Set(
    (projects ?? []).flatMap((p) => p.skills).map((s) => s.toLowerCase())
  );
  const cellCount = new Map<string, Map<VerticalType, number>>(); // skillKey → vertical → count
  const skillTotal = new Map<string, { label: string; total: number }>();
  for (const post of openPostings ?? []) {
    for (const skill of post.skills ?? []) {
      const key = skill.toLowerCase();
      const byVert = cellCount.get(key) ?? new Map<VerticalType, number>();
      byVert.set(post.vertical, (byVert.get(post.vertical) ?? 0) + 1);
      cellCount.set(key, byVert);
      const st = skillTotal.get(key) ?? { label: skill, total: 0 };
      st.total++;
      skillTotal.set(key, st);
    }
  }
  const rankedSkills = [...skillTotal.entries()].sort((a, b) => b[1].total - a[1].total);
  let rowKeys = rankedSkills.filter(([k]) => candidateSkillKeys.has(k)).slice(0, 6).map(([k]) => k);
  if (rowKeys.length === 0) rowKeys = rankedSkills.slice(0, 6).map(([k]) => k);
  // Pick the columns (verticals) with the most demand concentrated in the chosen rows.
  const colTotals = new Map<VerticalType, number>();
  for (const k of rowKeys) {
    for (const [vert, n] of cellCount.get(k) ?? []) {
      colTotals.set(vert, (colTotals.get(vert) ?? 0) + n);
    }
  }
  const colVerts = [...colTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([v]) => v);
  const skillDemand = {
    skills: rowKeys.map((k) => skillTotal.get(k)!.label),
    categories: colVerts.map((v) => verticalLabel(v)),
    cells: rowKeys.map((k) => colVerts.map((v) => cellCount.get(k)?.get(v) ?? 0)),
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
    />
  );
}

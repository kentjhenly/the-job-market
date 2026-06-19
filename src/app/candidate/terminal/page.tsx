import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { JOB_ROLES } from "@/lib/utils/constants";
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

  // In-demand skills the candidate's portfolio doesn't cover yet, ranked by how
  // many open employer roles ask for them. Scoped to the verticals the candidate
  // posts in, derived from their posting titles (vertical lives on postings now).
  const candidateSkills = new Set(
    (projects ?? []).flatMap((p) => p.skills).map((s) => s.toLowerCase())
  );
  const candidateVerticals = new Set(
    (postings ?? [])
      .map((p) => JOB_ROLES.find((r) => r.title === p.title)?.vertical)
      .filter((v): v is (typeof JOB_ROLES)[number]["vertical"] => v != null)
  );
  const demand = new Map<string, { label: string; count: number }>();
  for (const post of openPostings ?? []) {
    if (candidateVerticals.size > 0 && !candidateVerticals.has(post.vertical)) continue;
    for (const skill of post.skills ?? []) {
      const key = skill.toLowerCase();
      if (candidateSkills.has(key)) continue;
      const entry = demand.get(key);
      if (entry) entry.count++;
      else demand.set(key, { label: skill, count: 1 });
    }
  }
  const skillGap = [...demand.values()].sort((a, b) => b.count - a.count).slice(0, 6);

  return (
    <DashboardClient
      candidateId={session.user.id}
      candidate={candidate}
      profile={profile}
      postingSummary={postingSummary}
      pitchStats={pitchStats}
      skillGap={skillGap}
      projects={projects ?? []}
      scoreHistory={scoreHistory ?? []}
      totalVisible={totalVisible ?? 0}
    />
  );
}

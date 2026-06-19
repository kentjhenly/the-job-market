import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { DataRow } from "@/components/terminal/DataRow";
import { Delta } from "@/components/terminal/Delta";
import { LiveDot } from "@/components/terminal/LiveDot";
import { ScoreTicker } from "@/components/terminal/ScoreTicker";
import { Sparkline } from "@/components/charts/Sparkline";
import { formatSalary, formatShortDate, formatPercentile } from "@/lib/utils/formatters";
import { SalaryBenchmarkCarousel, type BenchmarkSlide } from "@/components/terminal/SalaryBenchmarkCarousel";
import { repVar, scoreBadgeVariant } from "@/lib/utils/score";

type MatchRow = {
  id: string;
  status: string;
  created_at: string;
  offered_salary: number | null;
  employer_job_postings: { title: string } | null;
  candidates: { years_exp_claimed: number | null; profiles: { display_name: string } | null } | null;
};

type MatcherEntry = {
  candidate_id: string;
  candidate_posting_id: string;
  match_score: number;
  match_percentile: number;
  posting_id: string;
  posting_title: string;
};

const EXP_BUCKETS = [
  { label: "0-2Y", min: 0, max: 3 },
  { label: "3-4Y", min: 3, max: 5 },
  { label: "5-7Y", min: 5, max: 8 },
  { label: "8Y+",  min: 8, max: 999 },
];

export default async function EmployerDashboardPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
  const nowIso = now.toISOString();

  // Fetch employer first — repScore is needed for the percentile queries below
  const { data: employer } = await supabase
    .from("employers")
    .select("*")
    .eq("id", session.user.id)
    .single();

  const repScore = employer?.reputation_score ?? 100;

  // Wave 1: all remaining independent DB queries in parallel
  const [
    { data: allMatches },
    { data: rawMatchDetail },
    { data: reputationEvents },
    { data: employerPostings },
    { count: higherRepCount },
    { count: totalEmployers },
    { data: openPostings },
    { data: urgentMatches },
    { data: visibleCandIds },
  ] = await Promise.all([
    supabase.from("matches").select("status, offer_status, offered_salary, created_at, candidate_last_read_at").eq("employer_id", session.user.id),
    supabase
      .from("matches")
      .select("id, status, created_at, offered_salary, employer_job_postings(title), candidates(years_exp_claimed, profiles(display_name))")
      .eq("employer_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("reputation_events").select("weight, created_at, event_type").eq("subject_id", session.user.id).order("created_at", { ascending: true }),
    supabase.from("employer_job_postings").select("title, skills").eq("employer_id", session.user.id),
    supabase.from("employers").select("id", { count: "exact", head: true }).gt("reputation_score", repScore),
    supabase.from("employers").select("id", { count: "exact", head: true }),
    supabase.from("employer_job_postings").select("id, title, vertical").eq("employer_id", session.user.id).eq("status", "open"),
    supabase
      .from("matches")
      .select("id, expires_at, employer_job_postings(title), candidates(profiles(display_name))")
      .eq("employer_id", session.user.id)
      .eq("status", "pending")
      .gt("expires_at", nowIso)
      .lt("expires_at", in24h)
      .order("expires_at", { ascending: true }),
    supabase.from("candidates").select("id").eq("is_visible", true).limit(3000),
  ]);

  const matchDetail = (rawMatchDetail ?? []) as unknown as MatchRow[];

  // ---- pitch stats (computed before salary fetch to fix ordering) ----
  const ms = allMatches ?? [];
  const sent = ms.length;
  const pending = ms.filter(m => m.status === "pending").length;
  // "responded" = candidate actively accepted or declined (ghosted = no response, excluded)
  const responded = ms.filter(m => m.status === "accepted" || m.status === "declined").length;
  // "offerAccepted" = employer sent a hire offer AND candidate accepted it
  const offerAccepted = ms.filter(m => m.offer_status === "accepted").length;
  // pitch acceptance rate for the HIRING SUMMARY meter (how many pitches led to a chat)
  const pitchAccepted = ms.filter(m => m.status === "accepted").length;
  const acceptanceRate = sent > 0 ? Math.round((pitchAccepted / sent) * 100) : 0;
  const reviewed = ms.filter(m => (m as { candidate_last_read_at?: string | null }).candidate_last_read_at != null).length;
  const offeredSalaries = ms.filter(m => m.offered_salary).map(m => m.offered_salary as number);
  const avgOffered = offeredSalaries.length > 0
    ? Math.round(offeredSalaries.reduce((a, b) => a + b, 0) / offeredSalaries.length)
    : null;

  // Wave 2: candidate-matcher calls (parallel per posting) + market supply query
  const postingList = openPostings ?? [];
  const visibleSet = new Set((visibleCandIds ?? []).map(c => c.id));

  const [matcherSettled, { data: supplyRaw }] = await Promise.all([
    Promise.allSettled(
      postingList.slice(0, 10).map(async (posting) => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/candidate-matcher`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ posting_id: posting.id }),
            cache: "no-store",
          }
        );
        if (!res.ok) return [] as MatcherEntry[];
        const data = await res.json();
        return ((data.matches ?? []) as Array<{
          candidate_id: string;
          candidate_posting_id: string;
          match_score: number;
          match_percentile: number;
        }>).map(m => ({ ...m, posting_id: posting.id, posting_title: posting.title }));
      })
    ),
    supabase
      .from("candidate_job_postings")
      .select("title, years_exp, candidate_id")
      .limit(3000),
  ]);

  // ---- top matches: dedupe by candidate, take top 5 ----
  const allMatcherEntries: MatcherEntry[] = [];
  for (const r of matcherSettled) {
    if (r.status === "fulfilled") allMatcherEntries.push(...r.value);
  }
  const bestByCandidate = new Map<string, MatcherEntry>();
  for (const m of allMatcherEntries) {
    const existing = bestByCandidate.get(m.candidate_id);
    if (!existing || m.match_score > existing.match_score) bestByCandidate.set(m.candidate_id, m);
  }
  const topEntries = [...bestByCandidate.values()]
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 5);

  // Wave 3: fetch candidate details for top 5
  const topCandidateIds = topEntries.map(e => e.candidate_id);
  const topCandPostingIds = topEntries.map(e => e.candidate_posting_id);

  type CandDetailRow = {
    id: string;
    display_name: string;
    years_exp_claimed: number;
    desired_salary_max: number | null;
    posting_role: string | null;
    posting_years_exp: number | null;
    posting_location: string | null;
  };
  let topCandDetails: CandDetailRow[] = [];

  if (topCandidateIds.length > 0) {
    type CandRow = { id: string; years_exp_claimed: number | null; profiles: { display_name: string } | null };
    type CandPostingRow = {
      id: string;
      candidate_id: string;
      desired_salary_max: number | null;
      title: string;
      years_exp: number | null;
      location: string | null;
    };
    const [candResult, candPostingResult] = await Promise.all([
      supabase
        .from("candidates")
        .select("id, years_exp_claimed, profiles(display_name)")
        .in("id", topCandidateIds),
      supabase
        .from("candidate_job_postings")
        .select("id, candidate_id, desired_salary_max, title, years_exp, location")
        .in("id", topCandPostingIds),
    ]);
    const candRows = (candResult.data ?? []) as unknown as CandRow[];
    const candPostingRows = (candPostingResult.data ?? []) as unknown as CandPostingRow[];
    topCandDetails = candRows.map(c => {
      const posting = candPostingRows.find(p => p.candidate_id === c.id);
      return {
        id: c.id,
        display_name: c.profiles?.display_name ?? `CAND-${c.id.slice(0, 6).toUpperCase()}`,
        years_exp_claimed: c.years_exp_claimed ?? 0,
        desired_salary_max: posting?.desired_salary_max ?? null,
        posting_role: posting?.title ?? null,
        posting_years_exp: posting?.years_exp ?? null,
        posting_location: posting?.location ?? null,
      };
    });
  }

  // Build openPostingMap to attach employer posting's vertical to each top match
  type OpenPosting = { id: string; title: string; vertical: string };
  const openPostingMap = new Map((openPostings ?? []).map(p => [p.id, p as OpenPosting]));

  const topMatches = topEntries.map(e => ({
    ...e,
    employer_vertical: openPostingMap.get(e.posting_id)?.vertical ?? null,
    candidate: topCandDetails.find(c => c.id === e.candidate_id) ?? {
      id: e.candidate_id,
      display_name: `CAND-${e.candidate_id.slice(0, 6).toUpperCase()}`,
      years_exp_claimed: 0,
      desired_salary_max: null,
      posting_role: null,
      posting_years_exp: null,
      posting_location: null,
    },
  }));

  // Wave 4: pre-fetch role-anchored salary-regression for top 3 candidates (parallel)
  const benchmarkSlides: BenchmarkSlide[] = await Promise.all(
    topMatches.slice(0, 3).map(async (m): Promise<BenchmarkSlide> => {
      const role = m.candidate.posting_role ?? m.posting_title;
      const vertical = m.employer_vertical ?? null;
      const yearsExp = m.candidate.posting_years_exp ?? m.candidate.years_exp_claimed;
      const location = m.candidate.posting_location ?? null;
      const candSalary = m.candidate.desired_salary_max ?? null;

      const body: Record<string, unknown> = { years_exp: yearsExp };
      if (role) body.role = role;
      if (vertical) body.vertical = vertical;
      if (location) body.location = location;
      if (candSalary) body.monthly_salary = candSalary;

      type CurvePoint = { years_exp: number; p25: number; p50: number; p75: number; p90: number };
      let curve: CurvePoint[] = [];
      let nPoints = 0;
      let offerPercentile: number | undefined;
      let marginalPerYear: number | undefined;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/salary-regression`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            cache: "no-store",
          }
        );
        if (res.ok) {
          const data = await res.json();
          curve = data.curve ?? [];
          nPoints = (data.n_points ?? (data.points?.length ?? 0)) as number;
          offerPercentile = candSalary ? (data.candidate_percentile as number | undefined) : undefined;
          marginalPerYear = data.marginal_per_year as number | undefined;
        }
      } catch { /* edge function unavailable */ }

      return { candidateName: m.candidate.display_name, roleTitle: role, location, yearsExp, candSalary, curve, nPoints, offerPercentile, marginalPerYear };
    })
  );

  // ---- reputation history ----
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const delta30d = (reputationEvents ?? [])
    .filter(e => e.created_at > thirtyDaysAgo)
    .reduce((s, e) => s + e.weight, 0);

  const sparkPoints: number[] = [];
  let running = 100;
  for (const ev of (reputationEvents ?? [])) {
    running = Math.max(0, Math.min(100, running + ev.weight));
    sparkPoints.push(running);
  }
  if (sparkPoints.length < 4) {
    const base = repScore;
    sparkPoints.push(base - 3, base - 1, base + 1, base, base + 2, base);
  }

  const score30dAgo = repScore - delta30d;
  const high30d = Math.min(100, Math.max(repScore, score30dAgo));
  const low30d = Math.max(0, Math.min(repScore, score30dAgo));
  const startDate = (reputationEvents ?? []).length > 0 ? reputationEvents![0].created_at : null;
  const rank = (higherRepCount ?? 0) + 1;
  const total = totalEmployers ?? 1;

  // ---- focus areas ----
  const skillFreq = new Map<string, number>();
  (employerPostings ?? []).flatMap(p => p.skills ?? []).forEach(s => skillFreq.set(s, (skillFreq.get(s) ?? 0) + 1));

  // ---- subscription ----
  const subscriptionActive = employer?.subscription_status === "active";
  const nextAction = !subscriptionActive
    ? "Upgrade to access the full candidate feed and send pitches."
    : sent === 0
      ? "Browse the feed and send your first pitch to a matched candidate."
      : pending > 0
        ? `${pending} pitch${pending > 1 ? "es" : ""} awaiting candidate response.`
        : "Browse the feed to find your next hire.";

  const repColor = repVar(repScore);
  const employerPercentile = total > 1 ? Math.round(((total - rank) / (total - 1)) * 100) : 100;

  // ---- market supply heatmap ----
  const filteredSupply = (supplyRaw ?? []).filter(p => visibleSet.has(p.candidate_id));
  const titleCounts = new Map<string, number>();
  for (const p of filteredSupply) {
    titleCounts.set(p.title, (titleCounts.get(p.title) ?? 0) + 1);
  }
  const supplyRoles = [...titleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title]) => title);

  const marketSupply = supplyRoles.map(role => ({
    role,
    buckets: EXP_BUCKETS.map(bk => ({
      label: bk.label,
      count: filteredSupply.filter(p =>
        p.title === role &&
        (p.years_exp ?? 0) >= bk.min &&
        (p.years_exp ?? 0) < bk.max
      ).length,
    })),
  }));

  // ---- needs action ----
  const urgentList = (urgentMatches ?? []) as Array<{
    id: string;
    expires_at: string;
    employer_job_postings: { title: string } | null;
    candidates: { profiles: { display_name: string } | null } | null;
  }>;

  return (
    <div className="view-enter scroll-main space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="mono" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
            HIRING DESK
          </h1>
        </div>
        {employer?.verified && <Badge variant="gold">VERIFIED EMPLOYER</Badge>}
      </div>

      {/* ROW 1 — asymmetric hero: EMPLOYER REPUTATION + HIRING SUMMARY */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">

        {/* EMPLOYER REPUTATION */}
        <div className="panel panel-accent flex flex-col">
          <div className="panel-head">
            <span className="panel-title">EMPLOYER REPUTATION</span>
            <LiveDot label="LIVE" className="ml-auto" />
          </div>
          <div className="flex flex-1 flex-col p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <ScoreTicker score={repScore} size="xl" suffix="/100" color={repColor} />
                <div className="mt-3 flex flex-wrap items-center gap-3.5">
                  {delta30d !== 0 && <Delta value={delta30d} />}
                  <span className="mono tnum" style={{ fontSize: 12, fontWeight: 600, color: delta30d > 0 ? "var(--up)" : delta30d < 0 ? "var(--down)" : "var(--muted)" }}>
                    30D {delta30d > 0 ? "+" : ""}{delta30d.toFixed(1)}
                  </span>
                  <Badge variant={scoreBadgeVariant(employerPercentile)}>{formatPercentile(employerPercentile)}</Badge>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 pt-1">
                <div className="flex items-baseline gap-2">
                  <span className="kicker">30D HIGH</span>
                  <span className="mono tnum" style={{ fontSize: 12, fontWeight: 600, color: "var(--up)" }}>{high30d.toFixed(1)}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="kicker">30D LOW</span>
                  <span className="mono tnum" style={{ fontSize: 12, fontWeight: 600, color: "var(--down)" }}>{low30d.toFixed(1)}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="kicker">RANK</span>
                  <span className="mono tnum" style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>#{rank} OF {total}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-1 flex-col">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="kicker">GROWTH TRAJECTORY · 30D</span>
                <span className="mono tnum" style={{ fontSize: 10.5, fontWeight: 600, color: delta30d > 0 ? "var(--up)" : delta30d < 0 ? "var(--down)" : "var(--muted)" }}>
                  {delta30d > 0 ? "▲ UP" : delta30d < 0 ? "▼ DOWN" : "▬ STABLE"} {Math.abs(delta30d).toFixed(1)} PTS
                </span>
              </div>
              <Sparkline data={sparkPoints} w={900} h={110} color={repColor} className="flex-1" />
              <div className="mt-1.5 flex justify-between">
                <span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>
                  {startDate ? `${formatShortDate(startDate)} · ${score30dAgo.toFixed(0)}` : `30D AGO · ${score30dAgo.toFixed(0)}`}
                </span>
                <span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>
                  TODAY · {repScore.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* HIRING SUMMARY */}
        <div className="panel flex flex-col" style={{ borderTopWidth: 2 }}>
          <div className="panel-head">
            <span className="panel-title">HIRING SUMMARY</span>
          </div>
          <div className="flex flex-1 flex-col p-4">
            {/* NEEDS ACTION strip */}
            {urgentList.length > 0 && (
              <Link
                href="/employer/matches"
                className="mb-3 flex items-center justify-between gap-2"
                style={{
                  background: "color-mix(in oklch, var(--down) 12%, transparent)",
                  border: "1px solid color-mix(in oklch, var(--down) 45%, transparent)",
                  borderRadius: "var(--r)",
                  padding: "8px 11px",
                  textDecoration: "none",
                }}
              >
                <span className="mono" style={{ fontSize: 11, color: "var(--down)", fontWeight: 600, letterSpacing: "0.08em" }}>
                  ▲ {urgentList.length} PITCH{urgentList.length > 1 ? "ES" : ""} EXPIRING &lt;24H
                </span>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--down)" }}>RESPOND →</span>
              </Link>
            )}
            {/* meter: acceptance rate */}
            <div className="py-2.5" style={{ borderBottom: "1px solid var(--border-soft)" }}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="kicker">ACCEPTANCE RATE</span>
                <span className="mono tnum" style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>
                  {sent > 0 ? `${acceptanceRate}%` : "—"}
                </span>
              </div>
              <div style={{ height: 3, background: "var(--surface-3)", borderRadius: 2 }}>
                <div style={{ width: `${acceptanceRate}%`, height: "100%", background: "var(--gold)", borderRadius: 2 }} />
              </div>
            </div>
            {/* meter: reputation */}
            <div className="py-2.5" style={{ borderBottom: "1px solid var(--border-soft)" }}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="kicker">REPUTATION</span>
                <span className="mono tnum" style={{ fontSize: 12, fontWeight: 600, color: repColor }}>
                  {repScore.toFixed(0)}/100
                </span>
              </div>
              <div style={{ height: 3, background: "var(--surface-3)", borderRadius: 2 }}>
                <div style={{ width: `${repScore}%`, height: "100%", background: repColor, borderRadius: 2 }} />
              </div>
            </div>
            <DataRow label="PLAN" value={(employer?.subscription_tier ?? "NONE").toUpperCase()} color={subscriptionActive ? "up" : undefined} />
            <DataRow label="PENDING PITCHES" value={pending} color={pending > 0 ? "gold" : undefined} />
            <DataRow label="AVG OFFER" value={avgOffered ? formatSalary(avgOffered) : "—"} color={avgOffered ? "up" : undefined} />
            {/* next best action */}
            <div
              className="mt-3 flex flex-1 flex-col"
              style={{ border: "1px solid color-mix(in oklch, var(--gold) 35%, transparent)", background: "var(--gold-dim)", borderRadius: "var(--r)", padding: "11px 13px" }}
            >
              <p className="mono" style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.16em" }}>NEXT BEST ACTION</p>
              <p className="mono mt-1.5" style={{ fontSize: 11.5, color: "var(--text)", lineHeight: 1.55 }}>{nextAction}</p>
              {!subscriptionActive && (
                <Link href="/employer/feed" className="link-up mono mt-2 block" style={{ fontSize: 11 }}>UPGRADE →</Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2 — 2×2 grid: TOP MATCHES · SALARY BENCHMARK · PITCH PIPELINE · MARKET SUPPLY */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* TOP MATCHES */}
        <div className="panel flex flex-col">
          <div className="panel-head">
            <span className="panel-title">TOP MATCHES</span>
            {topMatches.length > 0 && (
              <span className="mono ml-2" style={{ fontSize: 10.5, color: "var(--muted)" }}>
                ACROSS {postingList.length} POSTING{postingList.length !== 1 ? "S" : ""}
              </span>
            )}
            {postingList.length > 0 && (
              <Link href="/employer/feed" className="link-up mono ml-auto" style={{ fontSize: 11 }}>
                FEED →
              </Link>
            )}
          </div>
          {topMatches.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10">
              <p className="kicker text-center">NO OPEN POSTINGS</p>
              <Link href="/employer/postings" className="link-up mono mt-1" style={{ fontSize: 11 }}>
                CREATE POSTING →
              </Link>
            </div>
          ) : (
            <>
              <div
                className="grid items-center gap-2 px-4 py-2"
                style={{
                  gridTemplateColumns: "1.4rem 1fr 3.8rem 3rem 5rem",
                  borderBottom: "1px solid var(--border-soft)",
                }}
              >
                {["#", "CANDIDATE", "MATCH", "EXP", "SALARY"].map((h, i) => (
                  <span key={i} className="kicker">{h}</span>
                ))}
              </div>
              {topMatches.map((m, idx) => (
                <Link
                  key={m.candidate_id}
                  href={`/employer/postings/${m.posting_id}`}
                  className="grid items-center gap-2 px-4 py-2.5"
                  style={{
                    gridTemplateColumns: "1.4rem 1fr 3.8rem 3rem 5rem",
                    borderBottom: idx < topMatches.length - 1 ? "1px solid var(--border-soft)" : "none",
                    borderLeft: `2px solid ${idx === 0 ? "var(--up)" : "transparent"}`,
                    textDecoration: "none",
                  }}
                >
                  <span className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="mono truncate" style={{ fontSize: 12, color: "var(--text)", fontWeight: idx === 0 ? 600 : 400 }}>
                      {m.candidate.display_name}
                    </p>
                    <p className="mono truncate" style={{ fontSize: 10, color: "var(--dim)" }}>
                      {m.posting_title}
                    </p>
                  </div>
                  <span
                    className="mono tnum"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: m.match_score >= 70 ? "var(--up)" : m.match_score >= 45 ? "var(--gold)" : "var(--muted)",
                    }}
                  >
                    {m.match_score.toFixed(0)}%
                  </span>
                  <span className="mono tnum" style={{ fontSize: 11, color: "var(--text-2)" }}>
                    {m.candidate.years_exp_claimed > 0 ? `${m.candidate.years_exp_claimed}Y` : "—"}
                  </span>
                  <span className="mono tnum" style={{ fontSize: 10.5, color: "var(--text-2)" }}>
                    {m.candidate.desired_salary_max ? formatSalary(m.candidate.desired_salary_max) : "—"}
                  </span>
                </Link>
              ))}
            </>
          )}
        </div>

        {/* SALARY BENCHMARK */}
        <div className="panel">
          <SalaryBenchmarkCarousel slides={benchmarkSlides} />
        </div>

        {/* PITCH PIPELINE */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">PITCH PIPELINE</span>
            <Link href="/employer/matches" className="link-up mono ml-auto" style={{ fontSize: 11 }}>VIEW ALL</Link>
          </div>
          <div className="flex flex-col gap-2.5 px-4 py-3">
            {[
              { k: "SENT",      n: sent,         col: "var(--info)"         },
              { k: "REVIEWED",  n: reviewed,     col: "oklch(0.52 0.01 80)" },
              { k: "RESPONDED", n: responded,    col: "var(--gold)"         },
              { k: "ACCEPTED",  n: offerAccepted, col: "var(--up)"          },
            ].map((s, i, arr) => {
              const maxN = arr[0].n || 1;
              const prev = i > 0 ? arr[i - 1].n || 1 : null;
              const conv = prev != null ? Math.round((s.n / prev) * 100) : null;
              return (
                <div key={s.k} className="grid items-center gap-3" style={{ gridTemplateColumns: "5rem 1fr 2.5rem" }}>
                  <span className="kicker" style={{ color: "var(--muted)" }}>{s.k}</span>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div style={{
                      position: "relative",
                      overflow: "hidden",
                      width: `${Math.max(8, (s.n / maxN) * 100)}%`,
                      height: 28,
                      background: `color-mix(in oklch, ${s.col} 22%, transparent)`,
                      border: `1px solid color-mix(in oklch, ${s.col} 70%, transparent)`,
                      borderRadius: "var(--r)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "width .7s cubic-bezier(.2,.7,.3,1)",
                    }}>
                      <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: s.col, position: "relative", zIndex: 1 }}>{s.n}</span>
                      <div
                        className="bar-sheen"
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "35%",
                          height: "100%",
                          background: "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.32) 50%, transparent 90%)",
                        }}
                      />
                    </div>
                  </div>
                  <span className="mono tnum" style={{ fontSize: 10.5, textAlign: "right", color: conv != null ? (conv >= 50 ? "var(--up)" : "var(--muted)") : "transparent" }}>
                    {conv != null ? `${conv}%` : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-1.5 px-4 pb-3 pt-2.5">
            <span className="kicker">CLOSE RATE</span>
            <span className="mono tnum" style={{ fontSize: 11, fontWeight: 700, color: "var(--up)" }}>
              {sent > 0 ? Math.round((offerAccepted / sent) * 100) : 0}%
            </span>
            <span className="kicker">· {offerAccepted} HIRED OF {sent} SENT</span>
          </div>
        </div>

        {/* MARKET SUPPLY */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">MARKET SUPPLY</span>
            {filteredSupply.length > 0 && (
              <span className="mono ml-2" style={{ fontSize: 10.5, color: "var(--muted)" }}>
                {filteredSupply.length} POSTINGS
              </span>
            )}
          </div>
          <div className="p-4">
            {supplyRoles.length > 0 ? (
              <>
                <div className="mb-2 grid" style={{ gridTemplateColumns: "5.5rem 1fr 1fr 1fr 1fr" }}>
                  <span className="kicker" style={{ color: "var(--dim)" }}>ROLE</span>
                  {EXP_BUCKETS.map(b => <span key={b.label} className="kicker text-center">{b.label}</span>)}
                </div>
                {marketSupply.map(r => {
                  const maxC = Math.max(...r.buckets.map(b => b.count), 1);
                  return (
                    <div key={r.role} className="mb-1 grid items-center" style={{ gridTemplateColumns: "5.5rem 1fr 1fr 1fr 1fr" }}>
                      <span className="mono truncate" style={{ fontSize: 10, color: "var(--muted)" }}>
                        {r.role.toUpperCase().slice(0, 10)}
                      </span>
                      {r.buckets.map(b => (
                        <div key={b.label} className="p-0.5">
                          <div style={{
                            height: 22, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center",
                            background: b.count === 0
                              ? "var(--surface-2)"
                              : `color-mix(in oklch, var(--up) ${10 + Math.round((b.count / maxC) * 55)}%, transparent)`,
                          }}>
                            {b.count > 0 && (
                              <span className="mono tnum" style={{ fontSize: 10.5, fontWeight: 600, color: "var(--up)" }}>{b.count}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="kicker">LOW</span>
                  {[10, 25, 45, 65, 90].map(p => (
                    <div key={p} style={{ width: 14, height: 10, borderRadius: 1, background: `color-mix(in oklch, var(--up) ${p}%, transparent)` }} />
                  ))}
                  <span className="kicker">HIGH</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <p className="kicker">NO VISIBLE CANDIDATES ON PLATFORM YET</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

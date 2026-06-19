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
import { SalaryCurve } from "@/components/charts/SalaryCurve";
import { repVar, scoreBadgeVariant } from "@/lib/utils/score";

type MatchRow = {
  id: string;
  status: string;
  created_at: string;
  offered_salary: number | null;
  employer_job_postings: { title: string } | null;
  candidates: { years_exp_claimed: number | null; profiles: { display_name: string } | null } | null;
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

  const { data: employer } = await supabase
    .from("employers")
    .select("*")
    .eq("id", session.user.id)
    .single();

  const repScore = employer?.reputation_score ?? 100;

  const [
    { data: allMatches },
    { data: rawMatchDetail },
    { data: reputationEvents },
    { data: employerPostings },
    { count: higherRepCount },
    { count: totalEmployers },
  ] = await Promise.all([
    supabase.from("matches").select("status, offered_salary, created_at").eq("employer_id", session.user.id),
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
  ]);

  const matchDetail = (rawMatchDetail ?? []) as unknown as MatchRow[];

  // ---- salary benchmark ----
  const candYearsAll = matchDetail
    .map(m => (m.candidates as { years_exp_claimed?: number | null } | null)?.years_exp_claimed)
    .filter((y): y is number => y != null);
  const avgCandYears = candYearsAll.length > 0
    ? Math.round(candYearsAll.reduce((a, b) => a + b, 0) / candYearsAll.length)
    : 5;

  type CurvePoint = { years_exp: number; p25: number; p50: number; p75: number; p90: number };
  let salaryCurve: CurvePoint[] = [];
  let salaryNPoints = 0;
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
        body: JSON.stringify({ years_exp: avgCandYears, ...(avgOffered ? { monthly_salary: avgOffered } : {}) }),
        cache: "no-store",
      }
    );
    if (res.ok) {
      const data = await res.json();
      salaryCurve = data.curve ?? [];
      salaryNPoints = (data.n_points ?? (data.points?.length ?? 0)) as number;
      offerPercentile = avgOffered ? (data.candidate_percentile as number | undefined) : undefined;
      marginalPerYear = data.marginal_per_year as number | undefined;
    }
  } catch { /* edge function unavailable — chart will show empty state */ }

  // ---- pitch stats ----
  const ms = allMatches ?? [];
  const sent = ms.length;
  const pending = ms.filter(m => m.status === "pending").length;
  const accepted = ms.filter(m => m.status === "accepted").length;
  const declined = ms.filter(m => m.status === "declined").length;
  const ghosted = ms.filter(m => m.status === "ghosted").length;
  const responded = accepted + declined + ghosted;
  const acceptanceRate = sent > 0 ? Math.round((accepted / sent) * 100) : 0;

  const offeredSalaries = ms.filter(m => m.offered_salary).map(m => m.offered_salary as number);
  const avgOffered = offeredSalaries.length > 0
    ? Math.round(offeredSalaries.reduce((a, b) => a + b, 0) / offeredSalaries.length)
    : null;

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

  // ---- role demand grid ----
  const roles = [...new Set(matchDetail.map(m => m.employer_job_postings?.title).filter(Boolean) as string[])].slice(0, 5);
  const roleDemand = roles.map(role => ({
    role,
    buckets: EXP_BUCKETS.map(bk => ({
      label: bk.label,
      count: matchDetail.filter(m =>
        m.employer_job_postings?.title === role &&
        (m.candidates?.years_exp_claimed ?? 0) >= bk.min &&
        (m.candidates?.years_exp_claimed ?? 0) < bk.max
      ).length,
    })),
  }));

  // ---- focus areas ----
  const skillFreq = new Map<string, number>();
  (employerPostings ?? []).flatMap(p => p.skills ?? []).forEach(s => skillFreq.set(s, (skillFreq.get(s) ?? 0) + 1));
  const focusAreas = [...skillFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s]) => s);

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

      {/* ROW 1 — asymmetric hero (identical proportions to candidate COMPOSITE SCORE row) */}
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

        {/* POSITION SUMMARY */}
        <div className="panel flex flex-col" style={{ borderTopWidth: 2 }}>
          <div className="panel-head">
            <span className="panel-title">POSITION SUMMARY</span>
          </div>
          <div className="flex flex-1 flex-col p-4">
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

      {/* ROW 2 — SALARY BENCHMARK + PITCH PIPELINE */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* SALARY BENCHMARK */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">SALARY BENCHMARK</span>
            {offerPercentile != null && (
              <span className="mono tnum" style={{ fontSize: 11, color: "var(--info)" }}>
                {formatPercentile(offerPercentile).toUpperCase()}
              </span>
            )}
          </div>
          <div className="p-4">
            <SalaryCurve
              curve={salaryCurve.map(c => ({
                years_exp: c.years_exp,
                p25: c.p25,
                p50: c.p50,
                p75: c.p75,
                p90: c.p90,
              }))}
              nPoints={salaryNPoints}
              candYears={avgCandYears}
              candSalary={avgOffered ?? undefined}
              candPercentile={offerPercentile}
              marginalPerYear={marginalPerYear}
              tone="employer"
              height={285}
            />
          </div>
        </div>

        {/* PITCH PIPELINE */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">PITCH PIPELINE</span>
            <Link href="/employer/matches" className="link-up mono ml-auto" style={{ fontSize: 11 }}>VIEW ALL</Link>
          </div>
          <div className="flex flex-col gap-2.5 px-4 py-3">
            {[
              { k: "SENT",      n: sent,      col: "var(--info)" },
              { k: "RESPONDED", n: responded, col: "var(--gold)" },
              { k: "ACCEPTED",  n: accepted,  col: "var(--up)"   },
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
                      <div style={{
                        position: "absolute", top: 0, left: 0, width: "35%", height: "100%",
                        background: "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.32) 50%, transparent 90%)",
                      }} />
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
            <span className="kicker">ACCEPTANCE RATE</span>
            <span className="mono tnum" style={{ fontSize: 11, fontWeight: 700, color: "var(--up)" }}>
              {sent > 0 ? Math.round((accepted / sent) * 100) : 0}%
            </span>
            <span className="kicker">· {accepted} OF {sent} CLOSED</span>
          </div>
        </div>
      </div>

      {/* ROLE DEMAND */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">ROLE DEMAND</span>
        </div>
        <div className="p-4">
          {roles.length > 0 ? (
            <>
              <div className="mb-2 grid" style={{ gridTemplateColumns: "5.5rem 1fr 1fr 1fr 1fr" }}>
                <span />
                {EXP_BUCKETS.map(b => <span key={b.label} className="kicker text-center">{b.label}</span>)}
              </div>
              {roleDemand.map(r => {
                const maxC = Math.max(...r.buckets.map(b => b.count), 1);
                return (
                  <div key={r.role} className="mb-1 grid items-center" style={{ gridTemplateColumns: "5.5rem 1fr 1fr 1fr 1fr" }}>
                    <span className="mono truncate" style={{ fontSize: 10.5, color: "var(--muted)" }}>
                      {r.role.toUpperCase().slice(0, 10)}
                    </span>
                    {r.buckets.map(b => (
                      <div key={b.label} className="p-0.5">
                        <div style={{
                          height: 24, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center",
                          background: b.count === 0
                            ? "var(--surface-2)"
                            : `color-mix(in oklch, var(--up) ${10 + Math.round((b.count / maxC) * 55)}%, transparent)`,
                        }}>
                          {b.count > 0 && (
                            <span className="mono tnum" style={{ fontSize: 11, fontWeight: 600, color: "var(--up)" }}>{b.count}</span>
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
              <p className="kicker">SEND PITCHES TO SEE ROLE DEMAND</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import Link from "next/link";
import { DataRow } from "@/components/terminal/DataRow";
import { Badge } from "@/components/ui/Badge";
import { formatSalary, formatPercentile, formatShortDate } from "@/lib/utils/formatters";

type RecentMatch = {
  id: string;
  status: string;
  created_at: string;
  offered_salary: number | null;
};

function MeterRow({ label, value, pct, color }: { label: string; value: string; pct: number; color: "up" | "gold" | "down" }) {
  const col = color === "gold" ? "var(--gold)" : color === "down" ? "var(--down)" : "var(--up)";
  return (
    <div className="py-2.5" style={{ borderBottom: "1px solid var(--border-soft)" }}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="kicker">{label}</span>
        <span className="mono tnum" style={{ fontSize: 12, fontWeight: 600, color: col }}>{value}</span>
      </div>
      <div style={{ height: 3, background: "var(--surface-3)", borderRadius: 2 }}>
        <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", background: col, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function PitchFunnel({ sent, accepted }: { sent: number; accepted: number }) {
  const stages = [
    { k: "SENT",     n: sent,     col: "var(--info)" },
    { k: "ACCEPTED", n: accepted, col: "var(--up)" },
  ];
  const maxN = stages[0].n || 1;
  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      {stages.map((s, i) => {
        const widthPct = Math.max(8, (s.n / maxN) * 100);
        const conv = i > 0 ? Math.round((s.n / (stages[i - 1].n || 1)) * 100) : null;
        return (
          <div key={s.k} className="grid items-center gap-3" style={{ gridTemplateColumns: "5rem 1fr 2.5rem" }}>
            <span className="kicker" style={{ color: "var(--muted)" }}>{s.k}</span>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{
                width: `${widthPct}%`, height: 28,
                background: `color-mix(in oklch, ${s.col} 14%, transparent)`,
                border: `1px solid ${s.col}`,
                borderRadius: "var(--r)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "width .7s cubic-bezier(.2,.7,.3,1)",
              }}>
                <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: s.col }}>{s.n}</span>
              </div>
            </div>
            <span className="mono tnum" style={{ fontSize: 10.5, textAlign: "right", color: conv != null ? (conv >= 50 ? "var(--up)" : "var(--muted)") : "transparent" }}>
              {conv != null ? `${conv}%` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const SCORE_BANDS = [
  { label: "90+",   min: 90, max: 101, color: "var(--gold)" },
  { label: "75-89", min: 75, max: 90,  color: "var(--up)" },
  { label: "60-74", min: 60, max: 75,  color: "var(--info)" },
  { label: "40-59", min: 40, max: 60,  color: "var(--muted)" },
  { label: "0-39",  min: 0,  max: 40,  color: "var(--dim)" },
];

export default async function EmployerDashboardPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const [
    { data: employer },
    { data: allMatches },
    { data: recentMatches },
    { count: candidateCount },
    { data: candidateScores },
  ] = await Promise.all([
    supabase.from("employers").select("*").eq("id", session.user.id).single(),
    supabase.from("matches").select("status").eq("employer_id", session.user.id),
    supabase
      .from("matches")
      .select("id, status, created_at, offered_salary")
      .eq("employer_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("is_visible", true),
    supabase.from("candidates").select("composite_score").eq("is_visible", true),
  ]);

  const ms = allMatches ?? [];
  const sent = ms.length;
  const pending = ms.filter((m) => m.status === "pending").length;
  const accepted = ms.filter((m) => m.status === "accepted").length;
  const declined = ms.filter((m) => m.status === "declined").length;
  const acceptanceRate = sent > 0 ? Math.round((accepted / sent) * 100) : 0;
  const subscriptionActive = employer?.subscription_status === "active";
  const reputationScore = employer?.reputation_score ?? 100;

  const scores = (candidateScores ?? []).map((c) => c.composite_score);
  const distribution = SCORE_BANDS.map((b) => ({
    ...b,
    count: scores.filter((s) => s >= b.min && s < b.max).length,
  }));
  const maxBandCount = Math.max(...distribution.map((d) => d.count), 1);

  const nextAction = !subscriptionActive
    ? "Upgrade your plan to access the full candidate feed and send pitches."
    : sent === 0
      ? "Browse the feed and send your first pitch to a matched candidate."
      : pending > 0
        ? `${pending} pitch${pending > 1 ? "es are" : " is"} awaiting candidate response.`
        : "Browse the feed to find your next hire.";

  return (
    <div className="view-enter scroll-main max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="mono" style={{ color: "var(--text)", fontSize: 14, letterSpacing: "0.16em" }}>
              {employer?.company_name?.toUpperCase() ?? "HIRING DESK"}
            </h1>
            {employer?.verified && <Badge variant="gold">VERIFIED</Badge>}
          </div>
          <p className="kicker mt-1">
            {`HIRING DESK${employer?.industry ? ` · ${employer.industry.toUpperCase()}` : ""}`}
          </p>
        </div>
      </div>

      {/* Hero: asymmetric — EMPLOYER REPUTATION | HIRING DESK */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <div className="panel panel-accent flex flex-col">
          <div className="panel-head">
            <span className="panel-title">EMPLOYER REPUTATION</span>
          </div>
          <div className="flex flex-1 flex-col p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="mono tnum" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, color: reputationScore >= 80 ? "var(--up)" : reputationScore >= 50 ? "var(--gold)" : "var(--down)" }}>
                  {reputationScore.toFixed(0)}
                </span>
                <span className="mono" style={{ fontSize: 14, color: "var(--muted)", marginLeft: 4 }}>/100</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-end gap-3">
                  <span className="kicker">TALENT POOL</span>
                  <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {candidateCount ?? "—"}
                  </span>
                </div>
                <div className="flex items-baseline justify-end gap-3">
                  <span className="kicker">PITCHES SENT</span>
                  <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {sent}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <MeterRow
                label="ACCEPTANCE RATE"
                value={sent > 0 ? `${acceptanceRate}%` : "—"}
                pct={acceptanceRate}
                color={acceptanceRate >= 50 ? "up" : acceptanceRate >= 25 ? "gold" : "down"}
              />
            </div>
          </div>
        </div>

        <div className="panel flex flex-col">
          <div className="panel-head">
            <span className="panel-title">HIRING DESK</span>
          </div>
          <div className="flex flex-1 flex-col p-4">
            <DataRow
              label="SUBSCRIPTION"
              value={(employer?.subscription_tier ?? "NONE").toUpperCase()}
              color={subscriptionActive ? "up" : "down"}
            />
            <DataRow label="PENDING" value={pending} color={pending > 0 ? "gold" : undefined} />
            <DataRow label="ACCEPTED" value={accepted} color={accepted > 0 ? "up" : undefined} />
            <DataRow label="DECLINED" value={declined} />
            <div
              className="mt-3 flex flex-1 flex-col"
              style={{
                border: "1px solid color-mix(in oklch, var(--gold) 35%, transparent)",
                background: "var(--gold-dim)",
                borderRadius: "var(--r)",
                padding: "11px 13px",
              }}
            >
              <p className="mono" style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.16em" }}>
                NEXT BEST ACTION
              </p>
              <p className="mono mt-1.5" style={{ fontSize: 11.5, color: "var(--text)", lineHeight: 1.55 }}>
                {nextAction}
              </p>
              {!subscriptionActive && (
                <Link href="/employer/feed" className="link-up mono mt-2 block" style={{ fontSize: 11 }}>
                  UPGRADE →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SCORE DISTRIBUTION | COMPANY PROFILE */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">TALENT SCORE DISTRIBUTION</span>
            <Link href="/employer/feed" className="link-up mono" style={{ fontSize: 11 }}>
              OPEN FEED →
            </Link>
          </div>
          <div className="flex flex-col gap-2 p-4">
            {distribution.map((b) => (
              <div key={b.label} className="grid items-center gap-3" style={{ gridTemplateColumns: "3.5rem 1fr 2.5rem" }}>
                <span className="kicker" style={{ color: "var(--muted)" }}>{b.label}</span>
                <div style={{ height: 22, background: "var(--surface-3)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.max(4, (b.count / maxBandCount) * 100)}%`,
                      height: "100%",
                      background: `color-mix(in oklch, ${b.color} 30%, transparent)`,
                      borderRight: `2px solid ${b.color}`,
                      borderRadius: 3,
                      transition: "width .6s cubic-bezier(.2,.7,.3,1)",
                    }}
                  />
                </div>
                <span className="mono tnum" style={{ fontSize: 11, color: b.color, textAlign: "right" }}>{b.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">COMPANY PROFILE</span>
            <Link href="/employer/settings" className="link-up mono" style={{ fontSize: 11 }}>
              EDIT
            </Link>
          </div>
          <div className="px-4">
            <DataRow label="COMPANY" value={employer?.company_name ?? "—"} />
            <DataRow label="SIZE" value={employer?.company_size ?? "NOT SET"} />
            <DataRow label="INDUSTRY" value={employer?.industry ?? "NOT SET"} />
            <DataRow label="HEADQUARTERS" value={employer?.headquarters ?? "NOT SET"} />
            <DataRow label="VERIFIED" value={employer?.verified ? "YES" : "PENDING"} color={employer?.verified ? "up" : undefined} />
          </div>
        </div>
      </div>

      {/* PITCH PIPELINE funnel */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">PITCH PIPELINE</span>
          <Link href="/employer/matches" className="link-up mono" style={{ fontSize: 11 }}>
            VIEW ALL
          </Link>
        </div>
        <PitchFunnel sent={sent} accepted={accepted} />
        <div className="px-4 pb-3">
          <DataRow
            label="ACCEPTANCE RATE"
            value={sent > 0 ? `${acceptanceRate}%` : "—"}
            color={sent > 0 ? (acceptanceRate >= 50 ? "up" : acceptanceRate >= 25 ? "gold" : "down") : undefined}
          />
        </div>
      </div>

      {/* PITCH ACTIVITY */}
      {recentMatches && recentMatches.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">PITCH ACTIVITY</span>
            <Link href="/employer/matches" className="link-up mono" style={{ fontSize: 11 }}>
              VIEW ALL
            </Link>
          </div>
          <div>
            {(recentMatches as RecentMatch[]).map((m, idx) => {
              const color =
                m.status === "accepted"
                  ? "var(--up)"
                  : m.status === "declined" || m.status === "ghosted"
                    ? "var(--down)"
                    : "var(--gold)";
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: idx === recentMatches.length - 1 ? "none" : "1px solid var(--border-soft)" }}
                >
                  <span className="mono tnum" style={{ fontSize: 10.5, color: "var(--dim)" }}>
                    {formatShortDate(m.created_at)}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text)" }}>
                    {m.offered_salary ? formatSalary(m.offered_salary) : "SALARY NOT DISCLOSED"}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color }}>
                    {m.status.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import Link from "next/link";
import { DataRow } from "@/components/terminal/DataRow";
import { StatCard } from "@/components/terminal/StatCard";
import { ScoreBar } from "@/components/charts/ScoreBar";
import { formatSalary, formatPercentile } from "@/lib/utils/formatters";

type TopCandidate = {
  composite_score: number;
  percentile_rank: number;
  profiles: { display_name: string } | null;
};

export default async function EmployerDashboardPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const [
    { data: employer },
    { data: allMatches },
    { data: recentMatches },
    { count: candidateCount },
    { data: topCandidates },
  ] = await Promise.all([
    supabase.from("employers").select("*").eq("id", session.user.id).single(),
    supabase.from("matches").select("status").eq("employer_id", session.user.id),
    supabase
      .from("matches")
      .select("id, status, created_at, offered_salary")
      .eq("employer_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("is_visible", true),
    supabase
      .from("candidates")
      .select("composite_score, percentile_rank, profiles(display_name)")
      .eq("is_visible", true)
      .order("composite_score", { ascending: false })
      .limit(5),
  ]);

  const ms = allMatches ?? [];
  const sent = ms.length;
  const pending = ms.filter((m) => m.status === "pending").length;
  const accepted = ms.filter((m) => m.status === "accepted").length;
  const declined = ms.filter((m) => m.status === "declined").length;
  const acceptanceRate = sent > 0 ? Math.round((accepted / sent) * 100) : 0;
  const subscriptionActive = employer?.subscription_status === "active";
  const top = (topCandidates as unknown as TopCandidate[]) ?? [];

  return (
    <div className="view-enter scroll-main max-w-5xl space-y-6">
      <div>
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          {employer?.company_name?.toUpperCase() ?? "EMPLOYER DASHBOARD"}
        </h1>
        <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
          MARKET OVERVIEW
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="SUBSCRIPTION"
          footer={
            subscriptionActive ? (
              <span className="mono" style={{ fontSize: 11, color: "var(--up)" }}>ACTIVE</span>
            ) : (
              <Link href="/employer/feed" className="link-up mono" style={{ fontSize: 11 }}>
                UPGRADE →
              </Link>
            )
          }
        >
          <span
            className="mono tnum"
            style={{ fontSize: 28, fontWeight: 700, color: subscriptionActive ? "var(--up)" : "var(--down)", lineHeight: 1 }}
          >
            {(employer?.subscription_tier ?? "none").toUpperCase()}
          </span>
        </StatCard>

        <StatCard
          label="TALENT POOL"
          footer={
            <Link href="/employer/feed" className="link-up mono" style={{ fontSize: 11 }}>
              VIEW FEED →
            </Link>
          }
        >
          <span className="mono tnum" style={{ fontSize: 40, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
            {candidateCount ?? "—"}
          </span>
        </StatCard>

        <StatCard
          label="PENDING"
          footer={<span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>AWAITING RESPONSE</span>}
        >
          <span className="mono tnum" style={{ fontSize: 40, fontWeight: 700, color: pending > 0 ? "var(--gold)" : "var(--text)", lineHeight: 1 }}>
            {pending}
          </span>
        </StatCard>

        <StatCard
          label="HIRES"
          footer={<span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>MATCHES CLOSED</span>}
        >
          <span className="mono tnum" style={{ fontSize: 40, fontWeight: 700, color: accepted > 0 ? "var(--up)" : "var(--text)", lineHeight: 1 }}>
            {accepted}
          </span>
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">PITCH PIPELINE</span>
            <Link href="/employer/matches" className="link-up mono" style={{ fontSize: 11 }}>
              VIEW ALL
            </Link>
          </div>
          <div className="px-4">
            <DataRow label="SENT" value={sent} />
            <DataRow label="PENDING" value={pending} color={pending > 0 ? "gold" : undefined} />
            <DataRow label="ACCEPTED" value={accepted} color={accepted > 0 ? "up" : undefined} />
            <DataRow label="DECLINED" value={declined} />
            <DataRow
              label="ACCEPTANCE RATE"
              value={sent > 0 ? `${acceptanceRate}%` : "—"}
              color={sent > 0 ? (acceptanceRate >= 50 ? "up" : acceptanceRate >= 25 ? "gold" : "down") : undefined}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">TOP CANDIDATES</span>
            <Link href="/employer/feed" className="link-up mono" style={{ fontSize: 11 }}>
              OPEN FEED →
            </Link>
          </div>
          {top.length > 0 ? (
            <div>
              {top.map((c, i) => (
                <div
                  key={i}
                  className="grid items-center gap-3 px-4 py-2.5"
                  style={{
                    gridTemplateColumns: "1.4rem 1fr auto auto",
                    borderBottom: i < top.length - 1 ? "1px solid var(--border-soft)" : "none",
                  }}
                >
                  <span className="mono tnum" style={{ fontSize: 11, color: "var(--dim)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mono truncate" style={{ fontSize: 12, color: "var(--text)" }}>
                    {(c.profiles?.display_name ?? "CANDIDATE").toUpperCase()}
                  </span>
                  <ScoreBar score={c.composite_score} w={72} />
                  <span className="mono tnum" style={{ fontSize: 11, color: "var(--gold)", minWidth: 36, textAlign: "right" }}>
                    {formatPercentile(c.percentile_rank)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center">
              <p className="kicker">NO VISIBLE CANDIDATES YET</p>
            </div>
          )}
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
          <DataRow
            label="REPUTATION"
            value={`${employer?.reputation_score?.toFixed(0) ?? 100}/100`}
            color={(employer?.reputation_score ?? 100) >= 80 ? "up" : (employer?.reputation_score ?? 100) >= 50 ? "gold" : "down"}
          />
          <DataRow label="VERIFIED" value={employer?.verified ? "YES" : "PENDING"} color={employer?.verified ? "up" : undefined} />
        </div>
      </div>

      {recentMatches && recentMatches.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">RECENT PITCHES</span>
            <Link href="/employer/matches" className="link-up mono" style={{ fontSize: 11 }}>
              VIEW ALL
            </Link>
          </div>
          <div>
            {recentMatches.map((m, idx) => {
              const color =
                m.status === "accepted"
                  ? "var(--up)"
                  : m.status === "declined" || m.status === "ghosted"
                    ? "var(--down)"
                    : "var(--gold)";
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: idx === recentMatches.length - 1 ? "none" : "1px solid var(--border-soft)" }}
                >
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {new Date(m.created_at).toLocaleDateString()}
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

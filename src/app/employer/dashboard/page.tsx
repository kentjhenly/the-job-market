import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import Link from "next/link";
import { DataRow } from "@/components/terminal/DataRow";
import { StatCard } from "@/components/terminal/StatCard";
import { formatSalary } from "@/lib/utils/formatters";

export default async function EmployerDashboardPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const [{ data: employer }, { data: matches }, { count: candidateCount }] = await Promise.all([
    supabase.from("employers").select("*").eq("id", session.user.id).single(),
    supabase
      .from("matches")
      .select("id, status, created_at, offered_salary")
      .eq("employer_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .eq("is_visible", true),
  ]);

  const pendingCount = matches?.filter((m) => m.status === "pending").length ?? 0;
  const acceptedCount = matches?.filter((m) => m.status === "accepted").length ?? 0;

  return (
    <div className="view-enter max-w-3xl space-y-6">
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
          label="CREDITS"
          footer={<span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>PITCHES REMAINING</span>}
        >
          <span className="mono tnum" style={{ fontSize: 40, fontWeight: 700, color: "var(--up)", lineHeight: 1 }}>
            {employer?.credits ?? 0}
          </span>
        </StatCard>

        <StatCard
          label="CANDIDATES"
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
          <span className="mono tnum" style={{ fontSize: 40, fontWeight: 700, color: "var(--gold)", lineHeight: 1 }}>
            {pendingCount}
          </span>
        </StatCard>

        <StatCard
          label="ACCEPTED"
          footer={<span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>MATCHES CLOSED</span>}
        >
          <span className="mono tnum" style={{ fontSize: 40, fontWeight: 700, color: "var(--up)", lineHeight: 1 }}>
            {acceptedCount}
          </span>
        </StatCard>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">COMPANY PROFILE</span>
        </div>
        <div className="px-4">
          <DataRow label="COMPANY" value={employer?.company_name ?? "—"} />
          <DataRow label="SIZE" value={employer?.company_size ?? "NOT SET"} />
          <DataRow label="INDUSTRY" value={employer?.industry ?? "NOT SET"} />
          <DataRow label="REPUTATION" value={`${employer?.reputation_score?.toFixed(0) ?? 100}/100`} color="up" />
          <DataRow label="VERIFIED" value={employer?.verified ? "YES" : "PENDING"} />
        </div>
      </div>

      {matches && matches.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">RECENT PITCHES</span>
            <Link href="/employer/matches" className="link-up mono" style={{ fontSize: 11 }}>
              VIEW ALL
            </Link>
          </div>
          <div>
            {matches.map((m, idx) => {
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
                  style={{ borderBottom: idx === matches.length - 1 ? "none" : "1px solid var(--border-soft)" }}
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

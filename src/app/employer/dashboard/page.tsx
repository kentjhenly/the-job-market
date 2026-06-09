import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataRow } from "@/components/terminal/DataRow";
import { formatSalary } from "@/lib/utils/formatters";

export default async function EmployerDashboardPage() {
  const session = await getServerSession();
  const supabase = await getSupabaseServerClient();
  if (!session) return null;

  const [{ data: employer }, { data: matches }, { data: candidates }] = await Promise.all([
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
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-mono text-green text-sm tracking-widest">
          {employer?.company_name?.toUpperCase() ?? "EMPLOYER DASHBOARD"}
        </h1>
        <p className="text-muted text-xs font-mono mt-1">MARKET OVERVIEW</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardTitle className="mb-3">CREDITS</CardTitle>
          <div className="font-mono text-4xl font-bold text-green">
            {employer?.credits ?? 0}
          </div>
          <p className="text-muted text-xs font-mono mt-2">PITCHES REMAINING</p>
        </Card>

        <Card>
          <CardTitle className="mb-3">CANDIDATES</CardTitle>
          <div className="font-mono text-4xl font-bold text-white">
            {(candidates as any)?.count ?? "—"}
          </div>
          <Link href="/employer/feed" className="text-green text-xs font-mono mt-2 block hover:underline">
            VIEW FEED →
          </Link>
        </Card>

        <Card>
          <CardTitle className="mb-3">PENDING</CardTitle>
          <div className="font-mono text-4xl font-bold text-gold">{pendingCount}</div>
          <p className="text-muted text-xs font-mono mt-2">AWAITING RESPONSE</p>
        </Card>

        <Card>
          <CardTitle className="mb-3">ACCEPTED</CardTitle>
          <div className="font-mono text-4xl font-bold text-green">{acceptedCount}</div>
          <p className="text-muted text-xs font-mono mt-2">MATCHES CLOSED</p>
        </Card>
      </div>

      <Card noPadding>
        <CardHeader>
          <CardTitle>COMPANY PROFILE</CardTitle>
        </CardHeader>
        <div className="px-4 py-2">
          <DataRow label="COMPANY" value={employer?.company_name ?? "—"} />
          <DataRow label="SIZE" value={employer?.company_size ?? "NOT SET"} />
          <DataRow label="INDUSTRY" value={employer?.industry ?? "NOT SET"} />
          <DataRow label="REPUTATION" value={`${employer?.reputation_score?.toFixed(0) ?? 100}/100`} valueColor="green" />
          <DataRow label="VERIFIED" value={employer?.verified ? "YES" : "PENDING"} />
        </div>
      </Card>

      {matches && matches.length > 0 && (
        <Card noPadding>
          <CardHeader>
            <CardTitle>RECENT PITCHES</CardTitle>
            <Link href="/employer/matches" className="font-mono text-xs text-green hover:underline">
              VIEW ALL
            </Link>
          </CardHeader>
          <div className="divide-y divide-border">
            {matches.map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                <span className="font-mono text-xs text-muted">{new Date(m.created_at).toLocaleDateString()}</span>
                <span className="font-mono text-xs text-white">
                  {m.offered_salary ? formatSalary(m.offered_salary) : "SALARY NOT DISCLOSED"}
                </span>
                <span
                  className={`font-mono text-xs ${
                    m.status === "accepted"
                      ? "text-green"
                      : m.status === "declined" || m.status === "ghosted"
                        ? "text-danger"
                        : "text-gold"
                  }`}
                >
                  {m.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

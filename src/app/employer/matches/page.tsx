import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/Badge";
import { formatSalary, formatRelativeTime, formatPercentile } from "@/lib/utils/formatters";

export default async function EmployerMatchesPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("*, candidates(composite_score, percentile_rank, profiles(display_name))")
    .eq("employer_id", session.user.id)
    .order("created_at", { ascending: false });

  const statusVariant: Record<string, "up" | "down" | "gold" | "muted"> = {
    accepted: "up",
    declined: "down",
    ghosted: "down",
    expired: "muted",
    pending: "gold",
  };

  return (
    <div className="view-enter max-w-3xl space-y-6">
      <div>
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          SENT PITCHES
        </h1>
        <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
          TRACK YOUR OUTREACH AND MATCH STATUS
        </p>
      </div>

      {!matches || matches.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="kicker">NO PITCHES SENT YET. BROWSE THE CANDIDATE FEED TO GET STARTED.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m: any) => (
            <div key={m.id} className="panel">
              <div className="panel-head">
                <div>
                  <span className="panel-title">
                    {m.candidates?.profiles?.display_name ?? `CAND-${m.candidate_id?.slice(0, 6).toUpperCase()}`}
                  </span>
                  <p className="mono mt-0.5" style={{ fontSize: 11, color: "var(--muted)" }}>
                    PITCHED {formatRelativeTime(m.created_at)}
                  </p>
                </div>
                <Badge variant={statusVariant[m.status] ?? "muted"}>{m.status.toUpperCase()}</Badge>
              </div>
              <div className="space-y-2 px-4 py-3">
                {m.candidates?.composite_score != null && (
                  <p className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                    SCORE: <span style={{ color: "var(--up)" }}>{m.candidates.composite_score.toFixed(1)}</span>
                    {m.candidates.percentile_rank != null && <> · {formatPercentile(m.candidates.percentile_rank)}</>}
                  </p>
                )}
                {m.offered_salary && (
                  <p className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                    OFFERED: <span style={{ color: "var(--text)" }}>{formatSalary(m.offered_salary)}</span>
                  </p>
                )}
                {m.pitch_message && (
                  <p className="mono line-clamp-2" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {m.pitch_message}
                  </p>
                )}
                {m.status === "pending" && (
                  <p className="mono" style={{ fontSize: 11, color: "var(--gold)" }}>
                    EXPIRES {formatRelativeTime(m.expires_at)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

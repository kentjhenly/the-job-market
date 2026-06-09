import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatSalary, formatRelativeTime, formatPercentile } from "@/lib/utils/formatters";

export default async function EmployerMatchesPage() {
  const session = await getServerSession();
  const supabase = await getSupabaseServerClient();
  if (!session) return null;

  const { data: matches } = await supabase
    .from("matches")
    .select("*, candidates(composite_score, percentile_rank, profiles(display_name))")
    .eq("employer_id", session.user.id)
    .order("created_at", { ascending: false });

  const statusVariant: Record<string, "green" | "danger" | "gold" | "muted"> = {
    accepted: "green",
    declined: "danger",
    ghosted: "danger",
    expired: "muted",
    pending: "gold",
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-mono text-green text-sm tracking-widest">SENT PITCHES</h1>
        <p className="text-muted text-xs font-mono mt-1">
          TRACK YOUR OUTREACH AND MATCH STATUS
        </p>
      </div>

      {!matches || matches.length === 0 ? (
        <div className="border border-border bg-surface p-12 text-center">
          <p className="font-mono text-muted text-xs">
            NO PITCHES SENT YET. BROWSE THE CANDIDATE FEED TO GET STARTED.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m: any) => (
            <Card key={m.id} noPadding>
              <CardHeader>
                <div>
                  <CardTitle>
                    {m.candidates?.profiles?.display_name ??
                      `CAND-${m.candidate_id?.slice(0, 6).toUpperCase()}`}
                  </CardTitle>
                  <p className="text-muted text-xs font-mono mt-0.5">
                    PITCHED {formatRelativeTime(m.created_at)}
                  </p>
                </div>
                <Badge variant={statusVariant[m.status] ?? "muted"}>
                  {m.status.toUpperCase()}
                </Badge>
              </CardHeader>
              <div className="px-4 py-3 space-y-2">
                {m.candidates?.composite_score != null && (
                  <p className="font-mono text-xs text-muted">
                    SCORE:{" "}
                    <span className="text-green">
                      {m.candidates.composite_score.toFixed(1)}
                    </span>
                    {m.candidates.percentile_rank != null && (
                      <> · {formatPercentile(m.candidates.percentile_rank)}</>
                    )}
                  </p>
                )}
                {m.offered_salary && (
                  <p className="font-mono text-xs text-muted">
                    OFFERED: <span className="text-white">{formatSalary(m.offered_salary)}</span>
                  </p>
                )}
                {m.pitch_message && (
                  <p className="text-muted text-xs font-mono line-clamp-2">{m.pitch_message}</p>
                )}
                {m.status === "pending" && (
                  <p className="font-mono text-xs text-gold">
                    EXPIRES {formatRelativeTime(m.expires_at)}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

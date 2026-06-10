import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { DataRow } from "@/components/terminal/DataRow";
import { scoreBadgeVariant } from "@/lib/utils/score";
import { formatScore, formatPercentile, formatTimeRemaining } from "@/lib/utils/formatters";

interface ResultsPageProps {
  searchParams: Promise<{ resultId?: string }>;
  params: Promise<{ challengeId: string }>;
}

export default async function ChallengeResultsPage({
  searchParams,
  params,
}: ResultsPageProps) {
  const { resultId } = await searchParams;
  const { challengeId } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: result } = resultId
    ? await supabase
        .from("challenge_results")
        .select("*")
        .eq("id", resultId)
        .single()
    : { data: null };

  const { data: challenge } = await supabase
    .from("challenges")
    .select("title, max_score, vertical")
    .eq("id", challengeId)
    .single();

  return (
    <div className="view-enter max-w-2xl space-y-6">
      <div>
        <p className="kicker">CHALLENGE COMPLETE</p>
        <h1 className="mono mt-1" style={{ fontSize: 20, fontWeight: 700, color: "var(--up)" }}>
          {challenge?.title?.toUpperCase() ?? "RESULTS"}
        </h1>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">SCORE BREAKDOWN</span>
          {result && (
            <Badge variant={scoreBadgeVariant(result.raw_score ?? 0)}>
              {result.raw_score?.toFixed(0)}/{challenge?.max_score}
            </Badge>
          )}
        </div>
        <div className="px-4">
          <DataRow
            label="RAW SCORE"
            value={result ? `${formatScore(result.raw_score ?? 0)} / ${challenge?.max_score}` : "—"}
            color="up"
          />
          <DataRow
            label="PERCENTILE"
            value={result?.normalised_score != null ? formatPercentile(result.normalised_score) : "CALCULATING..."}
            color="gold"
          />
          <DataRow
            label="TIME TAKEN"
            value={result?.time_taken_sec != null ? formatTimeRemaining(result.time_taken_sec) : "—"}
          />
          <DataRow label="VERTICAL" value={challenge?.vertical?.toUpperCase() ?? "—"} />
        </div>
      </div>

      <div className="rounded-lg p-4" style={{ border: "1px solid color-mix(in oklch, var(--up) 40%, transparent)", background: "var(--up-dim)" }}>
        <p className="kicker" style={{ color: "var(--up)" }}>
          YOUR COMPOSITE SCORE IS BEING UPDATED
        </p>
        <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
          The recommendation algorithm will recalculate your ranking shortly.
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard" className="btn btn-primary">
          VIEW DASHBOARD
        </Link>
        <Link href="/challenges" className="btn btn-ghost">
          MORE CHALLENGES
        </Link>
      </div>
    </div>
  );
}

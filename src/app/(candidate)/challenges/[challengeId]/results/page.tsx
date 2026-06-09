import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataRow } from "@/components/terminal/DataRow";
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

  const scoreVariant =
    (result?.raw_score ?? 0) >= 80
      ? "gold"
      : (result?.raw_score ?? 0) >= 60
        ? "green"
        : "danger";

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <p className="font-mono text-muted text-xs tracking-widest">CHALLENGE COMPLETE</p>
        <h1 className="font-mono text-green text-xl mt-1">
          {challenge?.title?.toUpperCase() ?? "RESULTS"}
        </h1>
      </div>

      <Card noPadding className="mb-4">
        <CardHeader>
          <CardTitle>SCORE BREAKDOWN</CardTitle>
          {result && (
            <Badge variant={scoreVariant}>
              {result.raw_score?.toFixed(0)}/{challenge?.max_score}
            </Badge>
          )}
        </CardHeader>
        <div className="px-4 py-2">
          <DataRow
            label="RAW SCORE"
            value={result ? `${formatScore(result.raw_score ?? 0)} / ${challenge?.max_score}` : "—"}
            valueColor="green"
          />
          <DataRow
            label="PERCENTILE"
            value={
              result?.normalised_score != null
                ? formatPercentile(result.normalised_score)
                : "CALCULATING..."
            }
            valueColor="gold"
          />
          <DataRow
            label="TIME TAKEN"
            value={
              result?.time_taken_sec != null
                ? formatTimeRemaining(result.time_taken_sec)
                : "—"
            }
          />
          <DataRow label="VERTICAL" value={challenge?.vertical?.toUpperCase() ?? "—"} />
        </div>
      </Card>

      <div className="border border-green/20 bg-green/5 p-4 mb-6">
        <p className="font-mono text-green text-xs tracking-widest">
          YOUR COMPOSITE SCORE IS BEING UPDATED
        </p>
        <p className="font-mono text-muted text-xs mt-1">
          The recommendation algorithm will recalculate your ranking shortly.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="font-mono text-xs text-green border border-green px-4 py-2 hover:bg-green/10 transition-colors"
        >
          VIEW DASHBOARD
        </Link>
        <Link
          href="/challenges"
          className="font-mono text-xs text-muted border border-border px-4 py-2 hover:border-green hover:text-green transition-colors"
        >
          MORE CHALLENGES
        </Link>
      </div>
    </div>
  );
}

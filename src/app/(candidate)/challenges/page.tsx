import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function ChallengesPage() {
  const session = await getServerSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: challenges }, { data: results }] = await Promise.all([
    supabase.from("challenges").select("*").eq("is_active", true).order("created_at"),
    session
      ? supabase
          .from("challenge_results")
          .select("challenge_id, raw_score, normalised_score, scored_at, attempt_number")
          .eq("candidate_id", session.user.id)
      : { data: [] },
  ]);

  const completedMap = new Map(results?.map((r) => [r.challenge_id, r]));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-mono text-green text-sm tracking-widest">SKILL CHALLENGES</h1>
        <p className="text-muted text-xs font-mono mt-1">
          YOUR SCORES ARE YOUR APPLICATION. NO CV REQUIRED.
        </p>
      </div>

      <div className="space-y-3">
        {challenges?.map((c) => {
          const result = completedMap.get(c.id);
          const completed = !!result;

          return (
            <Card key={c.id} noPadding>
              <CardHeader>
                <div>
                  <CardTitle>{c.vertical.toUpperCase()} · {c.title}</CardTitle>
                  {c.description && (
                    <p className="text-muted text-xs font-mono mt-1 line-clamp-2">
                      {c.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {completed ? (
                    <Badge variant="green">
                      {result.raw_score?.toFixed(0)}/{c.max_score}
                    </Badge>
                  ) : (
                    <Badge variant="muted">NOT TAKEN</Badge>
                  )}
                  <Link
                    href={`/challenges/${c.id}`}
                    className="font-mono text-xs text-green hover:underline tracking-widest"
                  >
                    {completed ? "RETAKE" : "START →"}
                  </Link>
                </div>
              </CardHeader>
              <div className="px-4 py-3 flex gap-6">
                <span className="font-mono text-xs text-muted">
                  TIME: {Math.floor(c.time_limit_sec / 60)}MIN
                </span>
                <span className="font-mono text-xs text-muted">MAX: {c.max_score}PTS</span>
                {result && (
                  <span className="font-mono text-xs text-muted">
                    LAST: {new Date(result.scored_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

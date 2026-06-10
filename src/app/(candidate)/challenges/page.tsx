import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
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
    <div className="view-enter max-w-3xl space-y-6">
      <div>
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          SKILL CHALLENGES
        </h1>
        <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
          YOUR SCORES ARE YOUR APPLICATION. NO CV REQUIRED.
        </p>
      </div>

      <div className="space-y-3">
        {challenges?.map((c) => {
          const result = completedMap.get(c.id);
          const completed = !!result;

          return (
            <div key={c.id} className="panel">
              <div className="panel-head">
                <div>
                  <span className="panel-title">
                    {c.vertical.toUpperCase()} · {c.title}
                  </span>
                  {c.description && (
                    <p className="mt-1 line-clamp-2" style={{ fontSize: 11, color: "var(--muted)" }}>
                      {c.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {completed ? (
                    <Badge variant="up">
                      {result.raw_score?.toFixed(0)}/{c.max_score}
                    </Badge>
                  ) : (
                    <Badge variant="muted">NOT TAKEN</Badge>
                  )}
                  <Link href={`/challenges/${c.id}`} className="link-up mono" style={{ fontSize: 11, letterSpacing: "0.08em" }}>
                    {completed ? "RETAKE" : "START →"}
                  </Link>
                </div>
              </div>
              <div className="flex gap-6 px-4 py-3">
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  TIME: {Math.floor(c.time_limit_sec / 60)}MIN
                </span>
                <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  MAX: {c.max_score}PTS
                </span>
                {result && (
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                    LAST: {new Date(result.scored_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { EmployerPostingsGridClient } from "./EmployerPostingsGridClient";
import { FREE_JOB_POSTINGS } from "@/lib/utils/constants";

export default async function EmployerPostingsPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const [{ data: postings }, { data: matches }, { data: employer }] = await Promise.all([
    supabase
      .from("employer_job_postings")
      .select("*")
      .eq("employer_id", session.user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("matches")
      .select("posting_id, status")
      .eq("employer_id", session.user.id)
      .not("posting_id", "is", null),
    supabase
      .from("employers")
      .select("credits, free_postings_used")
      .eq("id", session.user.id)
      .single(),
  ]);

  const activeCounts: Record<string, number> = {};
  for (const m of matches ?? []) {
    if (!m.posting_id) continue;
    if (m.status === "pending" || m.status === "accepted") {
      activeCounts[m.posting_id] = (activeCounts[m.posting_id] ?? 0) + 1;
    }
  }

  const freePostingsRemaining = Math.max(0, FREE_JOB_POSTINGS - (employer?.free_postings_used ?? 0));
  const credits = employer?.credits ?? 0;

  return (
    <div className="view-enter space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
            POSTINGS
          </h1>
          <p className="mono mt-0.5" style={{ fontSize: 11, color: "var(--muted)" }}>
            OPEN ROLES · MATCHED AGAINST CANDIDATE POSTINGS
          </p>
        </div>
        <p className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>
          {freePostingsRemaining > 0 ? (
            <>
              FREE POSTINGS: <span className="c-up">{freePostingsRemaining}</span> /{" "}
              {FREE_JOB_POSTINGS} LEFT
            </>
          ) : (
            <>
              CREDITS: <span className={credits > 0 ? "c-gold" : "c-down"}>{credits}</span> ·
              1 CREDIT PER POSTING
            </>
          )}
        </p>
      </div>
      <EmployerPostingsGridClient
        initialPostings={postings ?? []}
        activeCounts={activeCounts}
        freePostingsRemaining={freePostingsRemaining}
        credits={credits}
      />
    </div>
  );
}

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { EmployerPostingsGridClient } from "./EmployerPostingsGridClient";

export default async function EmployerPostingsPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const [{ data: postings }, { data: matches }] = await Promise.all([
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
  ]);

  const activeCounts: Record<string, number> = {};
  for (const m of matches ?? []) {
    if (!m.posting_id) continue;
    if (m.status === "pending" || m.status === "accepted") {
      activeCounts[m.posting_id] = (activeCounts[m.posting_id] ?? 0) + 1;
    }
  }

  return (
    <div className="view-enter space-y-6">
      <div>
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          POSTINGS
        </h1>
        <p className="mono mt-0.5" style={{ fontSize: 11, color: "var(--muted)" }}>
          OPEN ROLES · MATCHED AGAINST CANDIDATE POSTINGS
        </p>
      </div>
      <EmployerPostingsGridClient initialPostings={postings ?? []} activeCounts={activeCounts} />
    </div>
  );
}

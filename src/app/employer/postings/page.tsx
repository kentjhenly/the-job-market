import Link from "next/link";
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
      .select("subscription_status")
      .eq("id", session.user.id)
      .single(),
  ]);

  const postingCount = postings?.length ?? 0;
  const subscriptionActive = employer?.subscription_status === "active";

  const activeCounts: Record<string, number> = {};
  for (const m of matches ?? []) {
    if (!m.posting_id) continue;
    if (m.status === "pending" || m.status === "accepted") {
      activeCounts[m.posting_id] = (activeCounts[m.posting_id] ?? 0) + 1;
    }
  }

  return (
    <div className="view-enter space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="mono" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
            POSTINGS
          </h1>
          <p className="mono mt-0.5" style={{ fontSize: 11, color: "var(--muted)" }}>
            OPEN ROLES · MATCHED AGAINST CANDIDATE POSTINGS
          </p>
        </div>
        {!subscriptionActive && (
          <div className="text-right">
            <p className="kicker">FREE TRIAL</p>
            <p
              className="mono tnum mt-0.5"
              style={{ fontSize: 14, color: postingCount >= FREE_JOB_POSTINGS ? "var(--down)" : "var(--up)" }}
            >
              {Math.min(postingCount, FREE_JOB_POSTINGS)} / {FREE_JOB_POSTINGS} POSTINGS USED
            </p>
            {postingCount >= FREE_JOB_POSTINGS && (
              <Link href="/employer/feed" className="link-up mono" style={{ fontSize: 11 }}>
                SUBSCRIBE FOR UNLIMITED →
              </Link>
            )}
          </div>
        )}
      </div>
      <EmployerPostingsGridClient initialPostings={postings ?? []} activeCounts={activeCounts} />
    </div>
  );
}

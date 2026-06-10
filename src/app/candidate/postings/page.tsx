import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { PostingsGridClient } from "./PostingsGridClient";

export default async function PostingsPage() {
  const session = await getServerSession();
  if (!session) return null;

  const supabase = getSupabaseServiceClient();

  const { data: postings } = await supabase
    .from("candidate_job_postings")
    .select("*")
    .eq("candidate_id", session.user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="view-enter space-y-6">
      <div>
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          POSTINGS
        </h1>
        <p className="mono mt-0.5" style={{ fontSize: 11, color: "var(--muted)" }}>
          JOB POSTINGS YOU&apos;RE OPEN TO — UP TO 10
        </p>
      </div>

      <PostingsGridClient initialPostings={postings ?? []} />
    </div>
  );
}

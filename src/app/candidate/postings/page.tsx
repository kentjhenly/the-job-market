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

  const count = postings?.length ?? 0;
  const countClass = count >= 10 ? "badge-up" : count >= 5 ? "badge-gold" : "badge-down";

  return (
    <div className="view-enter space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          POSTINGS
        </h1>
        <span className={`badge tnum ${countClass}`}>{count}/10</span>
      </div>

      <PostingsGridClient initialPostings={postings ?? []} />
    </div>
  );
}

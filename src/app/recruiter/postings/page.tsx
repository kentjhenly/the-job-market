import Link from "next/link";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { EmployerPostingsGridClient } from "./EmployerPostingsGridClient";
import { FREE_JOB_POSTINGS } from "@/lib/utils/constants";

export default async function EmployerPostingsPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const [{ data: postings }, { data: employer }] = await Promise.all([
    supabase
      .from("employer_job_postings")
      .select("*")
      .eq("employer_id", session.user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("employers")
      .select("subscription_status")
      .eq("id", session.user.id)
      .single(),
  ]);

  const postingCount = postings?.length ?? 0;
  const subscriptionActive = employer?.subscription_status === "active";

  return (
    <div className="view-enter space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="mono" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
          OPENINGS
        </h1>
        {!subscriptionActive && postingCount < FREE_JOB_POSTINGS && (
          <span className="badge badge-up tnum">
            FREE TRIAL {postingCount}/{FREE_JOB_POSTINGS}
          </span>
        )}
        {!subscriptionActive && postingCount >= FREE_JOB_POSTINGS && (
          <Link href="/recruiter/feed" className="link-up mono" style={{ fontSize: 11 }}>
            SUBSCRIBE FOR UNLIMITED →
          </Link>
        )}
      </div>
      <EmployerPostingsGridClient initialPostings={postings ?? []} />
    </div>
  );
}

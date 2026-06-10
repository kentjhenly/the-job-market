import { notFound } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { EmployerJobPostingForm } from "../EmployerJobPostingForm";
import { MatchedCandidatesPanel } from "../MatchedCandidatesPanel";

export default async function EmployerJobPostingPage({
  params,
}: {
  params: Promise<{ postingId: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;

  const { postingId } = await params;
  const supabase = getSupabaseServiceClient();
  const isNew = postingId === "new";

  if (isNew) {
    return <EmployerJobPostingForm initial={null} />;
  }

  const { data: posting } = await supabase
    .from("employer_job_postings")
    .select("*")
    .eq("id", postingId)
    .eq("employer_id", session.user.id)
    .single();

  if (!posting) notFound();

  return (
    <div className="space-y-6">
      <EmployerJobPostingForm initial={posting} />
      <MatchedCandidatesPanel postingId={posting.id} />
    </div>
  );
}

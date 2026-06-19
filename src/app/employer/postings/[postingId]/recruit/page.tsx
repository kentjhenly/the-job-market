import { notFound, redirect } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { RecruitFeedClient } from "./RecruitFeedClient";

export default async function RecruitPage({
  params,
}: {
  params: Promise<{ postingId: string }>;
}) {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const { postingId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: posting } = await supabase
    .from("employer_job_postings")
    .select("id, title, skills, status")
    .eq("id", postingId)
    .eq("employer_id", session.user.id)
    .single();

  if (!posting) notFound();

  return (
    <RecruitFeedClient
      postingId={posting.id}
      postingTitle={posting.title}
      postingSkills={posting.skills ?? []}
    />
  );
}

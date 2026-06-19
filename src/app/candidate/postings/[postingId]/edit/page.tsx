import { notFound } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { JobPostingForm } from "../../JobPostingForm";
import { SKILLS, type VerticalType } from "@/lib/utils/constants";

export default async function EditJobPostingPage({
  params,
}: {
  params: Promise<{ postingId: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;

  const { postingId } = await params;
  const supabase = getSupabaseServiceClient();

  const [{ data: posting }, { data: candidate }, { data: profile }, { data: projects }] =
    await Promise.all([
      supabase
        .from("candidate_job_postings")
        .select("*")
        .eq("id", postingId)
        .eq("candidate_id", session.user.id)
        .single(),
      supabase
        .from("candidates")
        .select("years_exp_claimed, location, citizenship")
        .eq("id", session.user.id)
        .single(),
      supabase.from("profiles").select("vertical").eq("id", session.user.id).single(),
      supabase
        .from("candidate_portfolio_projects")
        .select("skills")
        .eq("candidate_id", session.user.id),
    ]);

  if (!posting) notFound();

  const skillToVertical = new Map(SKILLS.map((s) => [s.name, s.vertical]));
  const verifiedVerticals = Array.from(
    new Set(
      (projects ?? [])
        .flatMap((p) => p.skills)
        .map((s) => skillToVertical.get(s))
        .filter((v): v is VerticalType => !!v)
    )
  );

  return (
    <JobPostingForm
      initial={posting}
      candYears={candidate?.years_exp_claimed ?? undefined}
      candLocation={candidate?.location ?? undefined}
      candCitizenship={candidate?.citizenship ?? undefined}
      vertical={profile?.vertical ?? undefined}
      verifiedVerticals={verifiedVerticals}
    />
  );
}

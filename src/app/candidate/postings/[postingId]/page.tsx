import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { JobPostingForm } from "../JobPostingForm";
import { SKILLS, type VerticalType } from "@/lib/utils/constants";

const MAX_POSTINGS = 10;

export default async function JobPostingPage({
  params,
}: {
  params: Promise<{ postingId: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;

  const { postingId } = await params;
  const supabase = getSupabaseServiceClient();
  const isNew = postingId === "new";

  const [{ data: candidate }, { data: profile }, { data: projects }] = await Promise.all([
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

  const skillToVertical = new Map(SKILLS.map((s) => [s.name, s.vertical]));
  const verifiedVerticals = Array.from(
    new Set(
      (projects ?? [])
        .flatMap((p) => p.skills)
        .map((s) => skillToVertical.get(s))
        .filter((v): v is VerticalType => !!v)
    )
  );

  if (isNew) {
    const { count } = await supabase
      .from("candidate_job_postings")
      .select("id", { count: "exact", head: true })
      .eq("candidate_id", session.user.id);

    if ((count ?? 0) >= MAX_POSTINGS) {
      return (
        <div className="view-enter max-w-2xl space-y-4">
          <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
            POSTINGS
          </h1>
          <p className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
            You&apos;ve reached the maximum of {MAX_POSTINGS} job postings. Delete one before creating another.
          </p>
          <Link href="/candidate/postings" className="link-up mono" style={{ fontSize: 11 }}>
            ← BACK TO POSTINGS
          </Link>
        </div>
      );
    }

    return (
      <JobPostingForm
        initial={null}
        candYears={candidate?.years_exp_claimed ?? undefined}
        candLocation={candidate?.location ?? undefined}
        candCitizenship={candidate?.citizenship ?? undefined}
        vertical={profile?.vertical ?? undefined}
        verifiedVerticals={verifiedVerticals}
      />
    );
  }

  const { data: posting } = await supabase
    .from("candidate_job_postings")
    .select("*")
    .eq("id", postingId)
    .eq("candidate_id", session.user.id)
    .single();

  if (!posting) notFound();

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

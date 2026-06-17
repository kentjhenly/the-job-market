import type { getSupabaseServiceClient } from "@/lib/supabase/server";

type ServiceClient = ReturnType<typeof getSupabaseServiceClient>;

// Years of experience lives per-posting now, but the salary regression, the
// dashboard salary curve, the recommendation scorer, and match-sourced salary
// data points all read a single candidates.years_exp_claimed. Mirror the
// candidate's highest posted experience back onto that column whenever their
// postings change so those consumers keep working unchanged.
export async function syncCandidateExperience(supabase: ServiceClient, candidateId: string) {
  const { data } = await supabase
    .from("candidate_job_postings")
    .select("years_exp")
    .eq("candidate_id", candidateId);

  const values = (data ?? []).map((p) => p.years_exp).filter((v): v is number => v != null);
  const max = values.length ? Math.max(...values) : null;

  await supabase.from("candidates").update({ years_exp_claimed: max }).eq("id", candidateId);
}

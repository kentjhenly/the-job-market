import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { MatchesClient } from "./MatchesClient";
import { FREE_MATCH_ACCEPTS } from "@/lib/utils/constants";
import type { Database } from "@/lib/supabase/types";

type MatchWithEmployer = Database["public"]["Tables"]["matches"]["Row"] & {
  employers: { company_name: string; reputation_score: number } | null;
};

export default async function CandidateMatchesPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const [{ data: matches }, { data: candidate }] = await Promise.all([
    supabase
      .from("matches")
      .select("*, employers(company_name, reputation_score)")
      .eq("candidate_id", session.user.id)
      .order("offered_salary", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("candidates").select("credits, free_accepts_used").eq("id", session.user.id).single(),
  ]);

  const freeAcceptsRemaining = Math.max(0, FREE_MATCH_ACCEPTS - (candidate?.free_accepts_used ?? 0));

  return (
    <MatchesClient
      matches={(matches as MatchWithEmployer[] | null) ?? []}
      freeAcceptsRemaining={freeAcceptsRemaining}
      credits={candidate?.credits ?? 0}
    />
  );
}

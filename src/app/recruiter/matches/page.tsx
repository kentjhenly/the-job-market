import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { EmployerMatchesClient } from "./EmployerMatchesClient";
import { sortByLastActivity } from "@/lib/utils/matchActivity";
import type { Database } from "@/lib/supabase/types";

type MatchWithCandidate = Database["public"]["Tables"]["matches"]["Row"] & {
  candidates: {
    composite_score: number;
    percentile_rank: number;
    profiles: { display_name: string } | null;
  } | null;
};

export default async function EmployerMatchesPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const { data } = await supabase
    .from("matches")
    .select("*, candidates(composite_score, percentile_rank, profiles(display_name))")
    .eq("employer_id", session.user.id)
    .order("created_at", { ascending: false });

  return <EmployerMatchesClient matches={sortByLastActivity((data as MatchWithCandidate[] | null) ?? [])} />;
}

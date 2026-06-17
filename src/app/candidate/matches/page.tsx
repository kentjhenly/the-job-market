import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { MatchesClient } from "./MatchesClient";
import { sortByLastActivity } from "@/lib/utils/matchActivity";
import type { Database } from "@/lib/supabase/types";

type MatchWithEmployer = Database["public"]["Tables"]["matches"]["Row"] & {
  employers: {
    company_name: string;
    reputation_score: number;
    company_size: string | null;
    industry: string | null;
    website: string | null;
    headquarters: string | null;
    description: string | null;
    verified: boolean;
    profiles: { display_name: string; email: string } | null;
  } | null;
};

export default async function CandidateMatchesPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "*, employers(company_name, reputation_score, company_size, industry, website, headquarters, description, verified, profiles(display_name, email))"
    )
    .eq("candidate_id", session.user.id)
    .order("created_at", { ascending: false });

  return <MatchesClient matches={sortByLastActivity((matches as MatchWithEmployer[] | null) ?? [])} />;
}

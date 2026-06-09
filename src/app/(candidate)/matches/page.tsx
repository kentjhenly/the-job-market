import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { MatchesClient } from "./MatchesClient";

export default async function CandidateMatchesPage() {
  const session = await getServerSession();
  const supabase = await getSupabaseServerClient();
  if (!session) return null;

  const { data: matches } = await supabase
    .from("matches")
    .select("*, employers(company_name, reputation_score)")
    .eq("candidate_id", session.user.id)
    .order("created_at", { ascending: false });

  return <MatchesClient matches={(matches as any) ?? []} />;
}

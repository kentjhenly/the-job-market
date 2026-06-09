import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession();
  const supabase = await getSupabaseServerClient();

  if (!session) return null;

  const [
    { data: candidate },
    { data: profile },
    { data: results },
    { data: scoreHistory },
    { data: challenges },
  ] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", session.user.id).single(),
    supabase.from("profiles").select("display_name").eq("id", session.user.id).single(),
    supabase
      .from("challenge_results")
      .select("challenge_id, raw_score, normalised_score, scored_at")
      .eq("candidate_id", session.user.id)
      .order("scored_at", { ascending: false }),
    supabase
      .from("score_history")
      .select("composite_score, recorded_at")
      .eq("candidate_id", session.user.id)
      .order("recorded_at", { ascending: false })
      .limit(30),
    supabase.from("challenges").select("id, title, vertical").eq("is_active", true),
  ]);

  return (
    <DashboardClient
      candidateId={session.user.id}
      candidate={candidate}
      profile={profile}
      results={results ?? []}
      scoreHistory={scoreHistory ?? []}
      challenges={challenges ?? []}
    />
  );
}

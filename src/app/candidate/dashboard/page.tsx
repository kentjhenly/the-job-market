import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) return null;

  const supabase = getSupabaseServiceClient();

  const [
    { data: candidate },
    { data: profile },
    { data: projects },
    { data: scoreHistory },
    { count: totalVisible },
    { data: recentMatches },
  ] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", session.user.id).single(),
    supabase.from("profiles").select("display_name").eq("id", session.user.id).single(),
    supabase
      .from("candidate_portfolio_projects")
      .select("id, title, skills, file_path, link_url, created_at")
      .eq("candidate_id", session.user.id),
    supabase
      .from("score_history")
      .select("composite_score, recorded_at")
      .eq("candidate_id", session.user.id)
      .order("recorded_at", { ascending: false })
      .limit(30),
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("is_visible", true),
    supabase
      .from("matches")
      .select("id, status, created_at, employers(company_name)")
      .eq("candidate_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <DashboardClient
      candidateId={session.user.id}
      candidate={candidate}
      profile={profile}
      projects={projects ?? []}
      scoreHistory={scoreHistory ?? []}
      totalVisible={totalVisible ?? 0}
      recentMatches={
        (recentMatches as unknown as {
          id: string;
          status: string;
          created_at: string;
          employers: { company_name: string } | null;
        }[]) ?? []
      }
    />
  );
}

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
  ] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", session.user.id).single(),
    supabase.from("profiles").select("display_name").eq("id", session.user.id).single(),
    supabase
      .from("candidate_portfolio_projects")
      .select("id, title, skills, file_path, link_url")
      .eq("candidate_id", session.user.id),
    supabase
      .from("score_history")
      .select("composite_score, recorded_at")
      .eq("candidate_id", session.user.id)
      .order("recorded_at", { ascending: false })
      .limit(30),
  ]);

  return (
    <DashboardClient
      candidateId={session.user.id}
      candidate={candidate}
      profile={profile}
      projects={projects ?? []}
      scoreHistory={scoreHistory ?? []}
    />
  );
}

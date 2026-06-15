import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { PortfolioGridClient } from "./PortfolioGridClient";

export default async function PortfolioPage() {
  const session = await getServerSession();
  if (!session) return null;

  const supabase = getSupabaseServiceClient();

  const { data: projects } = await supabase
    .from("candidate_portfolio_projects")
    .select("id, candidate_id, title, description, link_url, file_name, skills, created_at, updated_at")
    .eq("candidate_id", session.user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="view-enter space-y-6">
      <div>
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          PORTFOLIO
        </h1>
        <p className="mono mt-0.5" style={{ fontSize: 11, color: "var(--muted)" }}>
          PROJECTS THAT PROVE YOUR SKILLS — UP TO 10
        </p>
      </div>

      <PortfolioGridClient initialProjects={projects ?? []} />
    </div>
  );
}

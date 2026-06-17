import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { MAX_PORTFOLIO_PROJECTS } from "@/lib/utils/constants";
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
      <div className="flex items-center justify-between gap-3">
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          PORTFOLIO
        </h1>
        <span className="badge badge-up tnum">
          {(projects?.length ?? 0)}/{MAX_PORTFOLIO_PROJECTS}
        </span>
      </div>

      <PortfolioGridClient initialProjects={projects ?? []} />
    </div>
  );
}

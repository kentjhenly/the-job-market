import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { PortfolioForm } from "../PortfolioForm";
import { ProjectViewClient } from "./ProjectViewClient";
import { MAX_PORTFOLIO_PROJECTS } from "@/lib/utils/constants";

export default async function PortfolioProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;

  const { projectId } = await params;
  const supabase = getSupabaseServiceClient();
  const isNew = projectId === "new";

  if (isNew) {
    const { count } = await supabase
      .from("candidate_portfolio_projects")
      .select("id", { count: "exact", head: true })
      .eq("candidate_id", session.user.id);

    if ((count ?? 0) >= MAX_PORTFOLIO_PROJECTS) {
      return (
        <div className="view-enter max-w-2xl space-y-4">
          <h1 className="mono" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
            PORTFOLIO
          </h1>
          <p className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
            You&apos;ve reached the maximum of {MAX_PORTFOLIO_PROJECTS} portfolio projects. Delete one before creating another.
          </p>
          <Link href="/candidate/portfolio" className="link-up mono" style={{ fontSize: 11 }}>
            ← BACK TO PORTFOLIO
          </Link>
        </div>
      );
    }

    return <PortfolioForm initial={null} />;
  }

  const { data: project } = await supabase
    .from("candidate_portfolio_projects")
    .select("id, candidate_id, title, description, link_url, file_name, skills, created_at, updated_at")
    .eq("id", projectId)
    .eq("candidate_id", session.user.id)
    .single();

  if (!project) notFound();

  return <ProjectViewClient project={project} />;
}

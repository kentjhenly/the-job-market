import { notFound } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { PortfolioForm } from "../../PortfolioForm";

export default async function EditPortfolioProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await getServerSession();
  if (!session) return null;

  const { projectId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: project } = await supabase
    .from("candidate_portfolio_projects")
    .select("id, candidate_id, title, description, link_url, file_name, skills, created_at, updated_at")
    .eq("id", projectId)
    .eq("candidate_id", session.user.id)
    .single();

  if (!project) notFound();

  return <PortfolioForm initial={project} />;
}

import { notFound, redirect } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { EmployerJobPostingForm } from "../EmployerJobPostingForm";
import { PostingLobbyClient } from "./PostingLobbyClient";
import { UpgradePanel } from "../../feed/UpgradePanel";
import { FREE_JOB_POSTINGS } from "@/lib/utils/constants";

export default async function EmployerJobPostingPage({
  params,
}: {
  params: Promise<{ postingId: string }>;
}) {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const { postingId } = await params;
  const supabase = getSupabaseServiceClient();

  if (postingId === "new") {
    const [{ count }, { data: employer }] = await Promise.all([
      supabase
        .from("employer_job_postings")
        .select("id", { count: "exact", head: true })
        .eq("employer_id", session.user.id),
      supabase
        .from("employers")
        .select("subscription_tier, subscription_status")
        .eq("id", session.user.id)
        .single(),
    ]);

    const postingCount = count ?? 0;
    const isActive = employer?.subscription_status === "active";

    if (!isActive && postingCount >= FREE_JOB_POSTINGS) {
      return (
        <UpgradePanel
          status={employer?.subscription_status ?? "canceled"}
        />
      );
    }

    return <EmployerJobPostingForm initial={null} />;
  }

  const [{ data: posting }, { data: emp }] = await Promise.all([
    supabase
      .from("employer_job_postings")
      .select("*")
      .eq("id", postingId)
      .eq("employer_id", session.user.id)
      .single(),
    supabase
      .from("employers")
      .select("subscription_status")
      .eq("id", session.user.id)
      .single(),
  ]);

  if (!posting) notFound();

  const canEdit = emp?.subscription_status === "active";

  const { data: matchRows } = await supabase
    .from("matches")
    .select(
      "id, candidate_id, status, offered_salary, pitch_message, created_at, expires_at, offer_status, offer_salary, hired_at, last_message_at, employer_last_read_at, candidate_last_read_at"
    )
    .eq("posting_id", postingId)
    .eq("employer_id", session.user.id)
    .order("created_at", { ascending: false });

  const candidateIds = (matchRows ?? []).map((m) => m.candidate_id);
  const profileMap: Record<string, string | null> = {};
  const scoreMap: Record<
    string,
    {
      composite_score: number;
      percentile_rank: number;
      years_exp_claimed: number | null;
      reputation_score: number | null;
      location: string | null;
    }
  > = {};

  const portfolioMap: Record<
    string,
    { id: string; title: string; description: string | null; link_url: string | null; file_name: string | null; skills: string[] }[]
  > = {};

  if (candidateIds.length > 0) {
    const [{ data: profiles }, { data: candidates }, { data: portfolios }] = await Promise.all([
      supabase.from("profiles").select("id, display_name").in("id", candidateIds),
      supabase
        .from("candidates")
        .select("id, composite_score, percentile_rank, years_exp_claimed, reputation_score, location")
        .in("id", candidateIds),
      supabase
        .from("candidate_portfolio_projects")
        .select("id, candidate_id, title, description, link_url, file_name, skills")
        .in("candidate_id", candidateIds)
        .order("created_at", { ascending: false }),
    ]);
    (profiles ?? []).forEach((p) => {
      profileMap[p.id] = p.display_name;
    });
    (candidates ?? []).forEach((c) => {
      scoreMap[c.id] = {
        composite_score: c.composite_score,
        percentile_rank: c.percentile_rank,
        years_exp_claimed: c.years_exp_claimed,
        reputation_score: c.reputation_score,
        location: c.location,
      };
    });
    (portfolios ?? []).forEach((p) => {
      const list = portfolioMap[p.candidate_id] ?? [];
      list.push({ id: p.id, title: p.title, description: p.description, link_url: p.link_url, file_name: p.file_name, skills: p.skills });
      portfolioMap[p.candidate_id] = list;
    });
  }

  const matches = (matchRows ?? []).map((m) => ({
    ...m,
    display_name: profileMap[m.candidate_id] ?? null,
    composite_score: scoreMap[m.candidate_id]?.composite_score ?? 0,
    percentile_rank: scoreMap[m.candidate_id]?.percentile_rank ?? 0,
    years_exp_claimed: scoreMap[m.candidate_id]?.years_exp_claimed ?? null,
    reputation_score: scoreMap[m.candidate_id]?.reputation_score ?? null,
    location: scoreMap[m.candidate_id]?.location ?? null,
    portfolio: portfolioMap[m.candidate_id] ?? [],
  }));

  return <PostingLobbyClient posting={posting} initialMatches={matches} canEdit={canEdit} />;
}

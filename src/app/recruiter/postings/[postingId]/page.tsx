import { notFound, redirect } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { EmployerJobPostingForm } from "../EmployerJobPostingForm";
import { PostingLobbyClient } from "./PostingLobbyClient";

export default async function EmployerJobPostingPage({
  params,
}: {
  params: Promise<{ postingId: string }>;
}) {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const { postingId } = await params;

  if (postingId === "new") {
    return <EmployerJobPostingForm initial={null} />;
  }

  const supabase = getSupabaseServiceClient();

  const { data: posting } = await supabase
    .from("employer_job_postings")
    .select("*")
    .eq("id", postingId)
    .eq("employer_id", session.user.id)
    .single();

  if (!posting) notFound();

  const { data: matchRows } = await supabase
    .from("matches")
    .select(
      "id, candidate_id, status, offered_salary, created_at, expires_at, offer_status, hired_at, last_message_at, employer_last_read_at"
    )
    .eq("posting_id", postingId)
    .eq("employer_id", session.user.id)
    .order("created_at", { ascending: false });

  const candidateIds = (matchRows ?? []).map((m) => m.candidate_id);
  const profileMap: Record<string, string | null> = {};
  const scoreMap: Record<string, { composite_score: number; percentile_rank: number }> = {};

  if (candidateIds.length > 0) {
    const [{ data: profiles }, { data: candidates }] = await Promise.all([
      supabase.from("profiles").select("id, display_name").in("id", candidateIds),
      supabase.from("candidates").select("id, composite_score, percentile_rank").in("id", candidateIds),
    ]);
    (profiles ?? []).forEach((p) => {
      profileMap[p.id] = p.display_name;
    });
    (candidates ?? []).forEach((c) => {
      scoreMap[c.id] = { composite_score: c.composite_score, percentile_rank: c.percentile_rank };
    });
  }

  const matches = (matchRows ?? []).map((m) => ({
    ...m,
    display_name: profileMap[m.candidate_id] ?? null,
    composite_score: scoreMap[m.candidate_id]?.composite_score ?? 0,
    percentile_rank: scoreMap[m.candidate_id]?.percentile_rank ?? 0,
  }));

  return <PostingLobbyClient posting={posting} initialMatches={matches} />;
}

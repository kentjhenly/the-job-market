import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postingId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postingId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: posting } = await supabase
    .from("employer_job_postings")
    .select("id, max_candidates")
    .eq("id", postingId)
    .eq("employer_id", session.user.id)
    .single();

  if (!posting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ownership is now confirmed, so the existing-matches lookup and the
  // (slower) candidate-matcher ranking are independent, so run them together
  // instead of waiting for the first before kicking off the second.
  const [{ data: existingMatches }, res] = await Promise.all([
    supabase.from("matches").select("candidate_id, status").eq("posting_id", postingId),
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/candidate-matcher`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ posting_id: postingId }),
    }),
  ]);

  const activeStatuses = new Set(["pending", "accepted"]);
  const active = (existingMatches ?? []).filter((m) => activeStatuses.has(m.status)).length;
  const pitchedCandidateIds = (existingMatches ?? []).map((m) => m.candidate_id);

  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const matches: { candidate_id: string }[] = data.matches ?? [];
  const candidateIds = matches.map((m) => m.candidate_id);

  const portfolioSkillsMap: Record<string, string[]> = {};
  const portfolioProjectsMap: Record<string, { id: string; title: string; description: string | null; link_url: string | null; file_name: string | null; skills: string[] }[]> = {};
  if (candidateIds.length > 0) {
    const { data: projects } = await supabase
      .from("candidate_portfolio_projects")
      .select("id, candidate_id, title, description, link_url, file_name, skills")
      .in("candidate_id", candidateIds);

    for (const p of projects ?? []) {
      const existing = portfolioSkillsMap[p.candidate_id];
      if (existing) {
        for (const s of p.skills) {
          if (!existing.includes(s)) existing.push(s);
        }
      } else {
        portfolioSkillsMap[p.candidate_id] = [...p.skills];
      }
      const projList = portfolioProjectsMap[p.candidate_id] ?? [];
      projList.push({ id: p.id, title: p.title, description: p.description, link_url: p.link_url, file_name: p.file_name, skills: p.skills });
      portfolioProjectsMap[p.candidate_id] = projList;
    }
  }

  const enrichedMatches = matches.map((m) => ({
    ...m,
    portfolio_skills: portfolioSkillsMap[m.candidate_id] ?? [],
    portfolio_projects: portfolioProjectsMap[m.candidate_id] ?? [],
  }));

  return NextResponse.json({
    ...data,
    matches: enrichedMatches,
    pitchedCandidateIds,
    capacity: { max: posting.max_candidates, active },
  });
}

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { serverError } from "@/lib/utils/api";

// Self-service data export. PDPO DPP6 gives a data subject the right to access
// the personal data held about them; this returns a signed-in user's own data
// across every table as one downloadable JSON document. Uses the service client
// with explicit ownership filters (auth.uid() is always NULL for Better Auth
// sessions, so RLS can't scope this). file_path is deliberately omitted from the
// portfolio export so raw storage keys never leave the server.
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role;
  const supabase = getSupabaseServiceClient();

  try {
    const [profile, matches] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("matches").select("*").or(`candidate_id.eq.${userId},employer_id.eq.${userId}`),
    ]);

    const data: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      account: { id: userId, email: session.user.email, role: role ?? null },
      profile: profile.data ?? null,
      matches: matches.data ?? [],
    };

    if (role === "candidate") {
      const [candidate, postings, portfolio, scoreHistory, reputation, feedback] = await Promise.all([
        supabase.from("candidates").select("*").eq("id", userId).single(),
        supabase.from("candidate_job_postings").select("*").eq("candidate_id", userId),
        supabase
          .from("candidate_portfolio_projects")
          .select("id, title, description, link_url, file_name, skills, created_at, updated_at")
          .eq("candidate_id", userId),
        supabase.from("score_history").select("composite_score, recorded_at").eq("candidate_id", userId),
        supabase.from("reputation_events").select("event_type, weight, created_at").eq("subject_id", userId),
        supabase.from("portfolio_feedback").select("rating, created_at").eq("candidate_id", userId),
      ]);
      data.candidate = candidate.data ?? null;
      data.job_postings = postings.data ?? [];
      data.portfolio_projects = portfolio.data ?? [];
      data.score_history = scoreHistory.data ?? [];
      data.reputation_events = reputation.data ?? [];
      data.portfolio_feedback = feedback.data ?? [];
    } else if (role === "employer") {
      const [employer, postings, feedback] = await Promise.all([
        supabase.from("employers").select("*").eq("id", userId).single(),
        supabase.from("employer_job_postings").select("*").eq("employer_id", userId),
        supabase.from("portfolio_feedback").select("rating, created_at").eq("employer_id", userId),
      ]);
      data.employer = employer.data ?? null;
      data.job_postings = postings.data ?? [];
      data.portfolio_feedback = feedback.data ?? [];
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="the-job-market-data-${userId}.json"`,
      },
    });
  } catch (err) {
    return serverError("me/export GET", err);
  }
}

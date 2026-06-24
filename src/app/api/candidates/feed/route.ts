import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { serverError } from "@/lib/utils/api";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "employer") {
    return NextResponse.json({ error: "Employers only" }, { status: 403 });
  }

  const supabase = getSupabaseServiceClient();

  // Explicit column allowlist (not `*`): the feed must not ship candidate
  // biodata (date_of_birth, sex, citizenship, languages) or current_salary to
  // employers, none of which the feed renders. Data minimization, PDPO DPP1/DPP3.
  const { data: candidates, error } = await supabase
    .from("candidates")
    .select(
      "id, composite_score, percentile_rank, years_exp_claimed, desired_salary_min, desired_salary_max, location, remote_only, reputation_score, is_founder_verified, profiles(display_name), candidate_job_postings(title, location, work_eligible), candidate_portfolio_projects(id, title, description, link_url, file_name, skills)"
    )
    .eq("is_visible", true)
    .order("composite_score", { ascending: false })
    .limit(100);

  if (error) return serverError("candidates/feed GET", error);

  return NextResponse.json({ candidates: candidates ?? [] });
}

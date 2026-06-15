import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { MAX_POSTING_SKILLS } from "@/lib/utils/constants";
import { syncCandidateExperience } from "@/lib/postings/syncCandidateExperience";

const MAX_POSTINGS = 10;

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("candidate_job_postings")
    .select("*")
    .eq("candidate_id", session.user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ postings: data });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServiceClient();

  const { count } = await supabase
    .from("candidate_job_postings")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", session.user.id);

  if ((count ?? 0) >= MAX_POSTINGS) {
    return NextResponse.json({ error: "Maximum of 10 postings reached" }, { status: 400 });
  }

  const body = await request.json();

  if (Array.isArray(body.skills) && body.skills.length > MAX_POSTING_SKILLS) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_POSTING_SKILLS} skills per posting` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("candidate_job_postings")
    .insert({
      candidate_id: session.user.id,
      title: body.title,
      location: body.location ?? null,
      work_modes: body.work_modes ?? [],
      desired_salary_min: body.desired_salary_min ?? null,
      desired_salary_max: body.desired_salary_max ?? null,
      skills: body.skills ?? [],
      available_from: body.available_from ?? null,
      years_exp: body.years_exp ?? null,
      work_eligible: body.work_eligible ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await syncCandidateExperience(supabase, session.user.id);

  return NextResponse.json({ id: data.id });
}

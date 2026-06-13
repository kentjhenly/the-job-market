import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { FREE_JOB_POSTINGS, MAX_POSTING_SKILLS } from "@/lib/utils/constants";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("employer_job_postings")
    .select("*")
    .eq("employer_id", session.user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ postings: data });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "employer") {
    return NextResponse.json({ error: "Employers only" }, { status: 403 });
  }

  const supabase = getSupabaseServiceClient();
  const body = await request.json();

  if (Array.isArray(body.skills) && body.skills.length > MAX_POSTING_SKILLS) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_POSTING_SKILLS} skills per posting` },
      { status: 400 }
    );
  }

  const { data: employer, error: employerError } = await supabase
    .from("employers")
    .select("credits, free_postings_used")
    .eq("id", session.user.id)
    .single();

  if (employerError || !employer) {
    return NextResponse.json({ error: "Employer profile not found" }, { status: 404 });
  }

  const usingFreeTrial = employer.free_postings_used < FREE_JOB_POSTINGS;
  if (!usingFreeTrial && employer.credits < 1) {
    return NextResponse.json(
      { error: "Insufficient credits to create a job posting" },
      { status: 402 }
    );
  }

  const { data, error } = await supabase
    .from("employer_job_postings")
    .insert({
      employer_id: session.user.id,
      title: body.title,
      description: body.description ?? null,
      vertical: body.vertical ?? "tech",
      years_exp_min: body.years_exp_min ?? null,
      years_exp_max: body.years_exp_max ?? null,
      location: body.location ?? null,
      work_modes: body.work_modes ?? [],
      salary_min: body.salary_min ?? null,
      salary_max: body.salary_max ?? null,
      skills: body.skills ?? [],
      max_candidates: body.max_candidates ?? 5,
      status: body.status ?? "open",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("employers")
    .update(
      usingFreeTrial
        ? { free_postings_used: employer.free_postings_used + 1 }
        : { credits: employer.credits - 1 }
    )
    .eq("id", session.user.id);

  return NextResponse.json({ id: data.id });
}

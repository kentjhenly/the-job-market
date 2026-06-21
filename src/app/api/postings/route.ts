import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { validateCandidatePosting } from "@/lib/utils/postingValidation";

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

  const validated = validateCandidatePosting(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const fields = validated.value;

  const { data, error } = await supabase
    .from("candidate_job_postings")
    .insert({
      candidate_id: session.user.id,
      title: fields.title,
      location: body.location ?? null,
      work_modes: body.work_modes ?? [],
      desired_salary_min: fields.desired_salary_min,
      desired_salary_max: fields.desired_salary_max,
      skills: fields.skills,
      available_from: body.available_from ?? null,
      years_exp: fields.years_exp,
      work_eligible: body.work_eligible ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}

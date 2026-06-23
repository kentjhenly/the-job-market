import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { validateCandidatePosting } from "@/lib/utils/postingValidation";
import { serverError, parseJsonObject } from "@/lib/utils/api";

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

  if (error) return serverError("postings", error);

  return NextResponse.json({ postings: data });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "candidate") {
    return NextResponse.json({ error: "Candidates only" }, { status: 403 });
  }

  const supabase = getSupabaseServiceClient();

  const { count } = await supabase
    .from("candidate_job_postings")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", session.user.id);

  if ((count ?? 0) >= MAX_POSTINGS) {
    return NextResponse.json({ error: "Maximum of 10 postings reached" }, { status: 400 });
  }

  const parsed = await parseJsonObject(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

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
      location: fields.location,
      work_modes: fields.work_modes,
      desired_salary_min: fields.desired_salary_min,
      desired_salary_max: fields.desired_salary_max,
      skills: fields.skills,
      available_from: fields.available_from,
      years_exp: fields.years_exp,
      work_eligible: fields.work_eligible,
    })
    .select("id")
    .single();

  if (error) return serverError("postings", error);

  return NextResponse.json({ id: data.id });
}

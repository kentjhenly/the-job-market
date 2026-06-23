import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { validateCandidatePosting } from "@/lib/utils/postingValidation";
import { serverError, parseJsonObject } from "@/lib/utils/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postingId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postingId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("candidate_job_postings")
    .select("*")
    .eq("id", postingId)
    .eq("candidate_id", session.user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ posting: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postingId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postingId } = await params;
  const parsed = await parseJsonObject(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const validated = validateCandidatePosting(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const fields = validated.value;
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from("candidate_job_postings")
    .update({
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
    .eq("id", postingId)
    .eq("candidate_id", session.user.id);

  if (error) return serverError("postings[id]", error);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postingId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postingId } = await params;
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from("candidate_job_postings")
    .delete()
    .eq("id", postingId)
    .eq("candidate_id", session.user.id);

  if (error) return serverError("postings[id]", error);

  return NextResponse.json({ ok: true });
}

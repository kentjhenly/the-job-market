import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { MAX_POSTING_SKILLS } from "@/lib/utils/constants";
import { syncCandidateExperience } from "@/lib/postings/syncCandidateExperience";

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
  const body = await request.json();

  if (Array.isArray(body.skills) && body.skills.length > MAX_POSTING_SKILLS) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_POSTING_SKILLS} skills per posting` },
      { status: 400 }
    );
  }
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from("candidate_job_postings")
    .update({
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
    .eq("id", postingId)
    .eq("candidate_id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await syncCandidateExperience(supabase, session.user.id);

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await syncCandidateExperience(supabase, session.user.id);

  return NextResponse.json({ ok: true });
}

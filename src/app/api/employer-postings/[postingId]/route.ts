import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { validateEmployerPosting } from "@/lib/utils/postingValidation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postingId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postingId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("employer_job_postings")
    .select("*")
    .eq("id", postingId)
    .eq("employer_id", session.user.id)
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

  const validated = validateEmployerPosting(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const fields = validated.value;
  const supabase = getSupabaseServiceClient();

  // Editing openings requires an active subscription (even for free-trial
  // openings -- they can only be edited once the employer subscribes).
  if (body.status === undefined || body.status !== "closed") {
    const { data: employer } = await supabase
      .from("employers")
      .select("subscription_status")
      .eq("id", session.user.id)
      .single();

    if (employer?.subscription_status !== "active") {
      return NextResponse.json(
        { error: "An active subscription is required to edit openings" },
        { status: 402 }
      );
    }
  }

  const { error } = await supabase
    .from("employer_job_postings")
    .update({
      title: fields.title,
      description: fields.description,
      vertical: body.vertical ?? "tech",
      years_exp_min: fields.years_exp_min,
      years_exp_max: fields.years_exp_max,
      location: body.location ?? null,
      work_modes: body.work_modes ?? [],
      salary_min: fields.salary_min,
      salary_max: fields.salary_max,
      skills: fields.skills,
      max_candidates: fields.max_candidates,
      status: body.status ?? "open",
    })
    .eq("id", postingId)
    .eq("employer_id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
    .from("employer_job_postings")
    .delete()
    .eq("id", postingId)
    .eq("employer_id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

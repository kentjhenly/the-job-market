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
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from("employer_job_postings")
    .update({
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

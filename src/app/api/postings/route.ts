import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

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
      notice_period_days: body.notice_period_days ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}

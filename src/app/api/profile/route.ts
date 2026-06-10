import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServiceClient();

  const [{ data: profile }, { data: candidate }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, vertical")
      .eq("id", session.user.id)
      .single(),
    supabase
      .from("candidates")
      .select("years_exp_claimed, location, remote_only, desired_salary_min, desired_salary_max")
      .eq("id", session.user.id)
      .single(),
  ]);

  return NextResponse.json({ profile, candidate });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = getSupabaseServiceClient();

  await Promise.all([
    supabase
      .from("profiles")
      .update({
        display_name: body.display_name,
        vertical: body.vertical || null,
      })
      .eq("id", session.user.id),
    supabase
      .from("candidates")
      .update({
        years_exp_claimed: body.years_exp_claimed,
        location: body.location,
        remote_only: body.remote_only,
        desired_salary_min: body.desired_salary_min,
        desired_salary_max: body.desired_salary_max,
      })
      .eq("id", session.user.id),
  ]);

  return NextResponse.json({ ok: true });
}

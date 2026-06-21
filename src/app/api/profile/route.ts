import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { parseSalaryCents, parseIntInRange } from "@/lib/utils/security";
import { MAX_TITLE_LEN } from "@/lib/utils/constants";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServiceClient();

  const [{ data: profile }, { data: candidate }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .single(),
    supabase
      .from("candidates")
      .select(
        "date_of_birth, sex, languages, citizenship, location, years_exp_claimed, exp_months, current_salary, current_job_location, current_job_vertical, current_job_role"
      )
      .eq("id", session.user.id)
      .single(),
  ]);

  return NextResponse.json({ profile, candidate });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Validate numeric fields that feed the salary regression / scoring so a
  // client can't persist negative or absurd values.
  const yearsExp = body.years_exp_claimed == null ? null : parseIntInRange(body.years_exp_claimed, 0, 80);
  if (body.years_exp_claimed != null && yearsExp == null) {
    return NextResponse.json({ error: "Invalid years of experience" }, { status: 400 });
  }
  const expMonths = body.exp_months == null ? null : parseIntInRange(body.exp_months, 0, 1200);
  if (body.exp_months != null && expMonths == null) {
    return NextResponse.json({ error: "Invalid experience months" }, { status: 400 });
  }
  const currentSalary = body.current_salary == null ? null : parseSalaryCents(body.current_salary);
  if (body.current_salary != null && currentSalary == null) {
    return NextResponse.json({ error: "Invalid current salary" }, { status: 400 });
  }

  const cap = (v: unknown, max: number): string | undefined =>
    typeof v === "string" ? v.slice(0, max) : undefined;
  const languages = Array.isArray(body.languages)
    ? body.languages.filter((l: unknown): l is string => typeof l === "string").slice(0, 30)
    : [];

  const supabase = getSupabaseServiceClient();

  await Promise.all([
    supabase
      .from("profiles")
      .update({
        display_name: cap(body.display_name, MAX_TITLE_LEN),
      })
      .eq("id", session.user.id),
    supabase
      .from("candidates")
      .update({
        date_of_birth: body.date_of_birth || null,
        sex: body.sex || null,
        languages,
        citizenship: body.citizenship || null,
        location: body.location || null,
        years_exp_claimed: yearsExp,
        exp_months: expMonths,
        current_salary: currentSalary,
        current_job_location: body.current_job_location || null,
        current_job_vertical: body.current_job_vertical || null,
        current_job_role: body.current_job_role || null,
      })
      .eq("id", session.user.id),
  ]);

  return NextResponse.json({ ok: true });
}

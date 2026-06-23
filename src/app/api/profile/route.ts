import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { parseSalaryCents, parseIntInRange } from "@/lib/utils/security";
import { MAX_TITLE_LEN, COUNTRIES, VERTICALS } from "@/lib/utils/constants";
import { parseJsonObject, serverError } from "@/lib/utils/api";

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
  if ((session.user as { role?: string }).role !== "candidate") {
    return NextResponse.json({ error: "Candidates only" }, { status: 403 });
  }

  const parsedBody = await parseJsonObject(request);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

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

  // Reference fields constrained to known option sets. Returns the value, null
  // when empty, or false when present-but-invalid so the caller can 400 (these
  // previously passed through and a rejected write was silently swallowed).
  const asCountry = (v: unknown): string | null | false =>
    v == null || v === "" ? null : typeof v === "string" && COUNTRIES.includes(v) ? v : false;
  const citizenship = asCountry(body.citizenship);
  const location = asCountry(body.location);
  const currentJobLocation = asCountry(body.current_job_location);
  if (citizenship === false || location === false || currentJobLocation === false) {
    return NextResponse.json({ error: "Invalid country selection" }, { status: 400 });
  }

  let currentJobVertical: string | null = null;
  if (body.current_job_vertical != null && body.current_job_vertical !== "") {
    if (
      typeof body.current_job_vertical !== "string" ||
      !(VERTICALS as readonly string[]).includes(body.current_job_vertical)
    ) {
      return NextResponse.json({ error: "Invalid industry" }, { status: 400 });
    }
    currentJobVertical = body.current_job_vertical;
  }

  if (
    body.date_of_birth != null &&
    body.date_of_birth !== "" &&
    (typeof body.date_of_birth !== "string" || Number.isNaN(Date.parse(body.date_of_birth)))
  ) {
    return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
  }
  const dateOfBirth = body.date_of_birth ? String(body.date_of_birth) : null;

  const cap = (v: unknown, max: number): string | undefined =>
    typeof v === "string" ? v.slice(0, max) : undefined;
  const languages = Array.isArray(body.languages)
    ? body.languages.filter((l: unknown): l is string => typeof l === "string").slice(0, 30)
    : [];

  const supabase = getSupabaseServiceClient();

  // Capture each update's error rather than discarding it: an invalid value
  // must surface as a failed response, not a silent { ok: true }.
  const [{ error: profileError }, { error: candidateError }] = await Promise.all([
    supabase
      .from("profiles")
      .update({
        display_name: cap(body.display_name, MAX_TITLE_LEN),
      })
      .eq("id", session.user.id),
    supabase
      .from("candidates")
      .update({
        date_of_birth: dateOfBirth,
        sex: body.sex ? String(body.sex).slice(0, 40) : null,
        languages,
        citizenship,
        location,
        years_exp_claimed: yearsExp,
        exp_months: expMonths,
        current_salary: currentSalary,
        current_job_location: currentJobLocation,
        current_job_vertical: currentJobVertical,
        current_job_role: body.current_job_role ? String(body.current_job_role).slice(0, MAX_TITLE_LEN) : null,
      })
      .eq("id", session.user.id),
  ]);

  if (profileError || candidateError) {
    return serverError("profile PATCH", profileError ?? candidateError);
  }

  return NextResponse.json({ ok: true });
}

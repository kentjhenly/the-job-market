import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { clampText, isSafeWebsiteInput } from "@/lib/utils/security";
import { MAX_TITLE_LEN, MAX_DESCRIPTION_LEN, COUNTRIES, COMPANY_SIZES } from "@/lib/utils/constants";
import { parseJsonObject, serverError } from "@/lib/utils/api";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServiceClient();

  const [{ data: profile }, { data: employer }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .single(),
    supabase
      .from("employers")
      .select(
        "company_name, company_size, industry, website, headquarters, description, subscription_tier, subscription_status, subscription_period_end"
      )
      .eq("id", session.user.id)
      .single(),
  ]);

  return NextResponse.json({ profile, employer });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "employer") {
    return NextResponse.json({ error: "Employers only" }, { status: 403 });
  }

  const parsedBody = await parseJsonObject(request);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const website = body.website ? String(body.website).trim() : "";
  if (website && !isSafeWebsiteInput(website)) {
    return NextResponse.json({ error: "Website must be a valid URL" }, { status: 400 });
  }

  // headquarters / company_size constrained to their known option sets so a
  // client can't store arbitrary strings (and a rejected enum write can't be
  // silently swallowed).
  if (
    body.headquarters != null &&
    body.headquarters !== "" &&
    (typeof body.headquarters !== "string" || !COUNTRIES.includes(body.headquarters))
  ) {
    return NextResponse.json({ error: "Invalid headquarters location" }, { status: 400 });
  }
  if (
    body.company_size != null &&
    body.company_size !== "" &&
    (typeof body.company_size !== "string" || !COMPANY_SIZES.includes(body.company_size))
  ) {
    return NextResponse.json({ error: "Invalid company size" }, { status: 400 });
  }

  // Length-cap required text without nulling it (preserves prior behavior for
  // NOT NULL columns); only nullable free text uses clampText.
  const cap = (v: unknown, max: number): string | undefined =>
    typeof v === "string" ? v.slice(0, max) : undefined;

  const supabase = getSupabaseServiceClient();

  const [{ error: profileError }, { error: employerError }] = await Promise.all([
    supabase
      .from("profiles")
      .update({
        display_name: cap(body.display_name, MAX_TITLE_LEN),
      })
      .eq("id", session.user.id),
    supabase
      .from("employers")
      .update({
        company_name: cap(body.company_name, MAX_TITLE_LEN),
        company_size: typeof body.company_size === "string" && body.company_size ? body.company_size : null,
        industry: body.industry ? String(body.industry).slice(0, MAX_TITLE_LEN) : null,
        website: website || null,
        headquarters: typeof body.headquarters === "string" && body.headquarters ? body.headquarters : null,
        description: clampText(body.description, MAX_DESCRIPTION_LEN),
      })
      .eq("id", session.user.id),
  ]);

  if (profileError || employerError) {
    return serverError("employer-profile PATCH", profileError ?? employerError);
  }

  return NextResponse.json({ ok: true });
}

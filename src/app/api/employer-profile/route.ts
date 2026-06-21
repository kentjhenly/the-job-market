import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { clampText, isSafeWebsiteInput } from "@/lib/utils/security";
import { MAX_TITLE_LEN, MAX_DESCRIPTION_LEN } from "@/lib/utils/constants";

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

  const body = await request.json();

  const website = body.website ? String(body.website).trim() : "";
  if (website && !isSafeWebsiteInput(website)) {
    return NextResponse.json({ error: "Website must be a valid URL" }, { status: 400 });
  }

  // Length-cap required text without nulling it (preserves prior behavior for
  // NOT NULL columns); only nullable free text uses clampText.
  const cap = (v: unknown, max: number): string | undefined =>
    typeof v === "string" ? v.slice(0, max) : undefined;

  const supabase = getSupabaseServiceClient();

  await Promise.all([
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
        company_size: body.company_size || null,
        industry: body.industry || null,
        website: website || null,
        headquarters: body.headquarters || null,
        description: clampText(body.description, MAX_DESCRIPTION_LEN),
      })
      .eq("id", session.user.id),
  ]);

  return NextResponse.json({ ok: true });
}

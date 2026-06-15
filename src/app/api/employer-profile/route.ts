import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

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
  const supabase = getSupabaseServiceClient();

  await Promise.all([
    supabase
      .from("profiles")
      .update({
        display_name: body.display_name,
      })
      .eq("id", session.user.id),
    supabase
      .from("employers")
      .update({
        company_name: body.company_name,
        company_size: body.company_size || null,
        industry: body.industry || null,
        website: body.website || null,
        headquarters: body.headquarters || null,
        description: body.description || null,
      })
      .eq("id", session.user.id),
  ]);

  return NextResponse.json({ ok: true });
}

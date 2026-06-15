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
      .select("display_name")
      .eq("id", session.user.id)
      .single(),
    supabase
      .from("candidates")
      .select("date_of_birth, sex, languages, citizenship")
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
      })
      .eq("id", session.user.id),
    supabase
      .from("candidates")
      .update({
        date_of_birth: body.date_of_birth || null,
        sex: body.sex || null,
        languages: Array.isArray(body.languages) ? body.languages : [],
        citizenship: body.citizenship || null,
      })
      .eq("id", session.user.id),
  ]);

  return NextResponse.json({ ok: true });
}

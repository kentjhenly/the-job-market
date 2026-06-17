import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

// Shared by both roles — the preference lives on `profiles`, gating the
// activity emails sent from /api/matches and /api/matches/[matchId]/respond.
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("email_notifications")
    .eq("id", session.user.id)
    .single();

  return NextResponse.json({ email_notifications: data?.email_notifications ?? true });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = getSupabaseServiceClient();

  await supabase
    .from("profiles")
    .update({ email_notifications: !!body.email_notifications })
    .eq("id", session.user.id);

  return NextResponse.json({ ok: true });
}

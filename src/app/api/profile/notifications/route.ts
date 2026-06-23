import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { parseBody, serverError } from "@/lib/utils/api";
import { notificationsSchema } from "@/lib/utils/schemas";

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

  const parsed = await parseBody(request, notificationsSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({ email_notifications: parsed.data.email_notifications })
    .eq("id", session.user.id);

  if (error) return serverError("notifications PATCH", error);

  return NextResponse.json({ ok: true });
}

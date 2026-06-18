import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const session = await getServerSession();
  if (!session || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { matchId } = await params;
  const { offer_status } = await request.json();

  const allowed = [null, "pending", "accepted", "declined"];
  if (!allowed.includes(offer_status)) {
    return NextResponse.json({ error: "Invalid offer_status" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("matches")
    .update({ offer_status })
    .eq("id", matchId)
    .select("id, offer_status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { serverError, parseBody } from "@/lib/utils/api";
import { adminOfferStatusSchema } from "@/lib/utils/schemas";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const session = await getServerSession();
  if (!session || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { matchId } = await params;
  const parsed = await parseBody(request, adminOfferStatusSchema);
  if (!parsed.ok) return parsed.response;
  const { offer_status } = parsed.data;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("matches")
    .update({ offer_status })
    .eq("id", matchId)
    .select("id, offer_status")
    .single();

  if (error) return serverError("admin/matches[id] PATCH", error);
  return NextResponse.json(data);
}

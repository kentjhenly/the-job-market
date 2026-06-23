import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { serverError, parseBody } from "@/lib/utils/api";
import { adminVerifySchema } from "@/lib/utils/schemas";

// Only mutation path for candidates.is_founder_verified -- gated by the admin
// allowlist so candidates can never set this themselves.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const session = await getServerSession();
  if (!session || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { candidateId } = await params;
  const parsed = await parseBody(request, adminVerifySchema);
  if (!parsed.ok) return parsed.response;
  const { is_founder_verified } = parsed.data;

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("candidates")
    .update({ is_founder_verified })
    .eq("id", candidateId);

  if (error) return serverError("admin/candidates PATCH", error);

  return NextResponse.json({ ok: true });
}

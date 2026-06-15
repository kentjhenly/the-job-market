import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";

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
  const { is_founder_verified } = await request.json();
  if (typeof is_founder_verified !== "boolean") {
    return NextResponse.json({ error: "is_founder_verified must be a boolean" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("candidates")
    .update({ is_founder_verified })
    .eq("id", candidateId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

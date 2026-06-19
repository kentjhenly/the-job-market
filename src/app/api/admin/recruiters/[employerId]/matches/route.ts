import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ employerId: string }> }) {
  const session = await getServerSession();
  if (!session || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { employerId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("matches")
    .select("id, status, offer_status, offer_salary, offered_salary, created_at, candidates(profiles(display_name))")
    .eq("employer_id", employerId)
    .eq("status", "accepted")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ matches: data ?? [] });
}

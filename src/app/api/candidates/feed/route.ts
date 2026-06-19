import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "employer") {
    return NextResponse.json({ error: "Employers only" }, { status: 403 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: candidates } = await supabase
    .from("candidates")
    .select("*, profiles(display_name), candidate_job_postings(title)")
    .eq("is_visible", true)
    .order("composite_score", { ascending: false })
    .limit(100);

  return NextResponse.json({ candidates: candidates ?? [] });
}

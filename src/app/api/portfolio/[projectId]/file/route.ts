import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("candidate_portfolio_projects")
    .select("file_path, candidate_id")
    .eq("id", projectId)
    .single();

  if (error || !data?.file_path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // The owning candidate can always access. Employers can access a candidate's
  // portfolio file if the candidate is visible in the feed, or there is a match
  // between them (covers the recruit feed and posting lobby).
  if (data.candidate_id !== session.user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profile?.role !== "employer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: candidate } = await supabase
      .from("candidates")
      .select("is_visible")
      .eq("id", data.candidate_id)
      .single();

    let allowed = candidate?.is_visible === true;

    if (!allowed) {
      const { data: match } = await supabase
        .from("matches")
        .select("id")
        .eq("employer_id", session.user.id)
        .eq("candidate_id", data.candidate_id)
        .limit(1)
        .maybeSingle();
      allowed = !!match;
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("portfolio-files")
    .createSignedUrl(data.file_path, 60);

  if (signedError || !signed) {
    return NextResponse.json({ error: "Could not generate file URL" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}

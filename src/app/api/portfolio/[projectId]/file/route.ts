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
    .select("file_path")
    .eq("id", projectId)
    .eq("candidate_id", session.user.id)
    .single();

  if (error || !data?.file_path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: signed, error: signedError } = await supabase.storage
    .from("portfolio-files")
    .createSignedUrl(data.file_path, 60);

  if (signedError || !signed) {
    return NextResponse.json({ error: "Could not generate file URL" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}

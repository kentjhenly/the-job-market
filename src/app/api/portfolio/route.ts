import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { MAX_PORTFOLIO_PROJECTS } from "@/lib/utils/constants";
import { triggerRecommendationScorer } from "@/lib/scoring/recommendation-scorer";

function parseSkills(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("candidate_portfolio_projects")
    .select("id, candidate_id, title, description, link_url, file_name, skills, created_at, updated_at")
    .eq("candidate_id", session.user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ projects: data });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServiceClient();

  const { count } = await supabase
    .from("candidate_portfolio_projects")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", session.user.id);

  if ((count ?? 0) >= MAX_PORTFOLIO_PROJECTS) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_PORTFOLIO_PROJECTS} portfolio projects reached` },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const title = formData.get("title");
  const description = formData.get("description");
  const linkUrl = formData.get("link_url");
  const file = formData.get("file");

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("candidate_portfolio_projects")
    .insert({
      candidate_id: session.user.id,
      title: title.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      link_url: typeof linkUrl === "string" && linkUrl.trim() ? linkUrl.trim() : null,
      skills: parseSkills(formData.get("skills")),
    })
    .select("id")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  if (file instanceof File && file.size > 0) {
    const filePath = `${session.user.id}/${inserted.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("portfolio-files")
      .upload(filePath, file, { contentType: file.type, upsert: true });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    await supabase
      .from("candidate_portfolio_projects")
      .update({ file_path: filePath, file_name: file.name })
      .eq("id", inserted.id);
  }

  triggerRecommendationScorer(session.user.id);

  return NextResponse.json({ id: inserted.id });
}

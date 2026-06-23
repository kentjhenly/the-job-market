import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { triggerRecommendationScorer } from "@/lib/scoring/recommendation-scorer";
import { sanitizeStorageFileName, isSafeHttpUrl, clampText } from "@/lib/utils/security";
import { MAX_TITLE_LEN, MAX_DESCRIPTION_LEN } from "@/lib/utils/constants";
import { serverError } from "@/lib/utils/api";
import type { Database } from "@/lib/supabase/types";

function parseSkills(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

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
    .select("id, candidate_id, title, description, link_url, file_name, skills, created_at, updated_at")
    .eq("id", projectId)
    .eq("candidate_id", session.user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ project: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: existing, error: fetchError } = await supabase
    .from("candidate_portfolio_projects")
    .select("file_path")
    .eq("id", projectId)
    .eq("candidate_id", session.user.id)
    .single();

  if (fetchError || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const title = formData.get("title");
  const description = formData.get("description");
  const linkUrl = formData.get("link_url");
  const file = formData.get("file");
  const removeFile = formData.get("remove_file");

  const cleanTitle = clampText(title, MAX_TITLE_LEN);
  if (!cleanTitle) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const linkValue = typeof linkUrl === "string" ? linkUrl.trim() : "";
  if (linkValue && !isSafeHttpUrl(linkValue)) {
    return NextResponse.json({ error: "Link must be a valid http(s) URL" }, { status: 400 });
  }

  const update: Database["public"]["Tables"]["candidate_portfolio_projects"]["Update"] = {
    title: cleanTitle,
    description: clampText(description, MAX_DESCRIPTION_LEN),
    link_url: linkValue || null,
    skills: parseSkills(formData.get("skills")),
  };

  if (file instanceof File && file.size > 0) {
    if (existing.file_path) {
      await supabase.storage.from("portfolio-files").remove([existing.file_path]);
    }
    const filePath = `${session.user.id}/${projectId}/${sanitizeStorageFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("portfolio-files")
      .upload(filePath, file, { contentType: file.type, upsert: true });

    if (uploadError) return serverError("portfolio[id] PATCH upload", uploadError);

    update.file_path = filePath;
    update.file_name = file.name;
  } else if (removeFile === "true" && existing.file_path) {
    await supabase.storage.from("portfolio-files").remove([existing.file_path]);
    update.file_path = null;
    update.file_name = null;
  }

  const { error } = await supabase
    .from("candidate_portfolio_projects")
    .update(update)
    .eq("id", projectId)
    .eq("candidate_id", session.user.id);

  if (error) return serverError("portfolio[id]", error);

  triggerRecommendationScorer(session.user.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: existing } = await supabase
    .from("candidate_portfolio_projects")
    .select("file_path")
    .eq("id", projectId)
    .eq("candidate_id", session.user.id)
    .single();

  if (existing?.file_path) {
    await supabase.storage.from("portfolio-files").remove([existing.file_path]);
  }

  const { error } = await supabase
    .from("candidate_portfolio_projects")
    .delete()
    .eq("id", projectId)
    .eq("candidate_id", session.user.id);

  if (error) return serverError("portfolio[id]", error);

  triggerRecommendationScorer(session.user.id);

  return NextResponse.json({ ok: true });
}

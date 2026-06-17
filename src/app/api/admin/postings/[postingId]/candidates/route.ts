import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";

// Mirrors GET /api/employer-postings/[postingId]/candidates, but for any
// posting (not just the caller's own) -- gated by the admin allowlist instead
// of posting ownership.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postingId: string }> }
) {
  const session = await getServerSession();
  if (!session || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { postingId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: posting } = await supabase
    .from("employer_job_postings")
    .select("id, max_candidates")
    .eq("id", postingId)
    .single();

  if (!posting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: existingMatches } = await supabase
    .from("matches")
    .select("candidate_id, status")
    .eq("posting_id", postingId);

  const activeStatuses = new Set(["pending", "accepted"]);
  const active = (existingMatches ?? []).filter((m) => activeStatuses.has(m.status)).length;
  const pitchedCandidateIds = (existingMatches ?? []).map((m) => m.candidate_id);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/candidate-matcher`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ posting_id: postingId }),
    }
  );

  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  return NextResponse.json({
    ...data,
    pitchedCandidateIds,
    capacity: { max: posting.max_candidates, active },
  });
}

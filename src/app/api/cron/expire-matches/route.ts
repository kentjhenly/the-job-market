import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

async function expireGhostedMatches() {
  const supabase = getSupabaseServiceClient();

  const { data: expired, error } = await supabase
    .from("matches")
    .update({ status: "ghosted", responded_at: new Date().toISOString() })
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString())
    .select("id, employer_id, candidate_id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (expired && expired.length > 0) {
    await supabase.from("reputation_events").insert(
      expired.map((m) => ({
        subject_id: m.candidate_id,
        actor_id: m.employer_id,
        event_type: "ghosted",
        weight: -15,
        match_id: m.id,
      }))
    );
  }

  return NextResponse.json({ expired: expired?.length ?? 0 });
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return expireGhostedMatches();
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return expireGhostedMatches();
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { sendPitchNotification } from "@/lib/email/send";

// Mirrors POST /api/matches, but lets the admin create a pitch on behalf of
// any employer (employer_id is supplied explicitly) -- gated by the admin
// allowlist instead of the caller's own role/subscription status.
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { employer_id, candidate_id, posting_id, pitch_message, offered_salary } = await request.json();
  if (!employer_id || !candidate_id) {
    return NextResponse.json({ error: "employer_id and candidate_id required" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: employer } = await supabase
    .from("employers")
    .select("company_name")
    .eq("id", employer_id)
    .single();

  if (!employer) {
    return NextResponse.json({ error: "Employer not found" }, { status: 404 });
  }

  // If pitching from a posting, enforce its candidate capacity
  if (posting_id) {
    const { data: posting } = await supabase
      .from("employer_job_postings")
      .select("max_candidates")
      .eq("id", posting_id)
      .eq("employer_id", employer_id)
      .single();

    if (!posting) {
      return NextResponse.json({ error: "Posting not found" }, { status: 404 });
    }

    const { data: existingMatches } = await supabase
      .from("matches")
      .select("status")
      .eq("posting_id", posting_id);

    const activeCount = (existingMatches ?? []).filter(
      (m) => m.status === "pending" || m.status === "accepted"
    ).length;

    if (activeCount >= posting.max_candidates) {
      return NextResponse.json(
        { error: `Posting has reached its candidate capacity (${posting.max_candidates})` },
        { status: 409 }
      );
    }
  }

  // Create match (will fail on duplicate due to unique index)
  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      employer_id,
      candidate_id,
      posting_id: posting_id ?? null,
      pitch_message: pitch_message ?? null,
      offered_salary: offered_salary ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Already have an open pitch to this candidate" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify candidate of the new pitch (best-effort, don't block the response)
  const { data: candidateProfile } = await supabase
    .from("profiles")
    .select("email, email_notifications")
    .eq("id", candidate_id)
    .single();

  if (candidateProfile && candidateProfile.email_notifications !== false) {
    sendPitchNotification({
      to: candidateProfile.email,
      companyName: employer.company_name,
      pitchMessage: pitch_message ?? null,
      offeredSalary: offered_salary ?? null,
    }).catch((err) => console.error("sendPitchNotification failed:", err));
  }

  return NextResponse.json({ matchId: match.id });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { sendMatchAcceptedNotification } from "@/lib/email/send";
import { formatSalaryBand } from "@/lib/utils/formatters";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const { action } = await request.json();

  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action must be accept or decline" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  // Verify the candidate owns this match
  const { data: match } = await supabase
    .from("matches")
    .select("id, employer_id, candidate_id, status, offered_salary, posting_id")
    .eq("id", matchId)
    .eq("candidate_id", session.user.id)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status !== "pending") {
    return NextResponse.json({ error: "Match is no longer pending" }, { status: 409 });
  }

  const newStatus = action === "accept" ? "accepted" : "declined";

  await supabase
    .from("matches")
    .update({ status: newStatus, responded_at: new Date().toISOString() })
    .eq("id", matchId);

  // Insert reputation event for employer (responded signal)
  await supabase.from("reputation_events").insert({
    subject_id: match.candidate_id,
    actor_id: match.employer_id,
    event_type: "responded",
    weight: 1,
    match_id: matchId,
  });

  // If accepted, insert match ticker event
  if (action === "accept") {
    await supabase.from("reputation_events").insert({
      subject_id: match.employer_id,
      actor_id: match.candidate_id,
      event_type: "completed_match",
      weight: 1,
      match_id: matchId,
    });

    // Pull real posting + candidate data so the ticker entry (and any new
    // salary data point) reflect this match instead of generic placeholders.
    const [{ data: posting }, { data: candidate }] = await Promise.all([
      match.posting_id
        ? supabase
            .from("employer_job_postings")
            .select("title, vertical, work_modes")
            .eq("id", match.posting_id)
            .single()
        : Promise.resolve({ data: null }),
      supabase
        .from("candidates")
        .select("years_exp_claimed, location, remote_only")
        .eq("id", match.candidate_id)
        .single(),
    ]);

    const vertical = posting?.vertical ?? "tech";
    const salaryBand = match.offered_salary
      ? formatSalaryBand(Math.round(match.offered_salary * 0.95), Math.round(match.offered_salary * 1.05))
      : null;

    await supabase.from("match_ticker_events").insert({
      vertical,
      role_label: posting?.title ? posting.title.toUpperCase() : "ENGINEER",
      salary_band: salaryBand,
      match_type: "match",
    });

    // Feed the accepted offer back into the salary regression dataset
    if (match.offered_salary && candidate?.years_exp_claimed != null) {
      await supabase.from("salary_data_points").insert({
        vertical,
        years_exp: candidate.years_exp_claimed,
        location: candidate.location,
        remote: posting ? posting.work_modes.includes("remote") : candidate.remote_only,
        monthly_salary: match.offered_salary,
        source: "match",
      });
    }

    // Notify employer that the candidate accepted (best-effort, don't block the response)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", [match.employer_id, match.candidate_id]);

    const employerProfile = profiles?.find((p) => p.id === match.employer_id);
    const candidateProfile = profiles?.find((p) => p.id === match.candidate_id);

    if (employerProfile && candidateProfile) {
      sendMatchAcceptedNotification({
        to: employerProfile.email,
        candidateName: candidateProfile.display_name,
      }).catch((err) => console.error("sendMatchAcceptedNotification failed:", err));
    }
  }

  return NextResponse.json({ status: newStatus });
}

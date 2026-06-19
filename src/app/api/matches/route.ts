import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { sendPitchNotification } from "@/lib/email/send";
import { FREE_JOB_POSTINGS } from "@/lib/utils/constants";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "employer") {
    return NextResponse.json({ error: "Employers only" }, { status: 403 });
  }

  const { candidate_id, pitch_message, offered_salary, posting_id } = await request.json();
  if (!candidate_id) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: employer } = await supabase
    .from("employers")
    .select("company_name, subscription_tier, subscription_status")
    .eq("id", session.user.id)
    .single();

  if (!employer) {
    return NextResponse.json({ error: "Employer profile not found" }, { status: 404 });
  }

  // Free trial: employers who have never subscribed (tier = 'none') can pitch
  // from their first FREE_JOB_POSTINGS openings without paying. Once a
  // subscription has been activated and later lapses, pitching requires renewal.
  if (employer.subscription_status !== "active") {
    let allowed = false;
    if (employer.subscription_tier === "none" && posting_id) {
      const { data: freePostings } = await supabase
        .from("employer_job_postings")
        .select("id")
        .eq("employer_id", session.user.id)
        .order("created_at", { ascending: true })
        .limit(FREE_JOB_POSTINGS);
      const freeIds = new Set((freePostings ?? []).map((p) => p.id));
      allowed = freeIds.has(posting_id);
    }
    if (!allowed) {
      return NextResponse.json(
        { error: "An active subscription is required to send pitches" },
        { status: 402 }
      );
    }
  }

  // If pitching from a posting, enforce its candidate capacity
  if (posting_id) {
    const { data: posting } = await supabase
      .from("employer_job_postings")
      .select("max_candidates")
      .eq("id", posting_id)
      .eq("employer_id", session.user.id)
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

  // Offered salary must fall within the candidate's desired range
  if (offered_salary != null) {
    const { data: candidatePostings } = await supabase
      .from("candidate_job_postings")
      .select("desired_salary_min, desired_salary_max")
      .eq("candidate_id", candidate_id);

    const hasRange = (candidatePostings ?? []).some(
      (p) => p.desired_salary_min != null && p.desired_salary_max != null
    );

    if (hasRange) {
      const inRange = (candidatePostings ?? []).some(
        (p) =>
          p.desired_salary_min != null &&
          p.desired_salary_max != null &&
          offered_salary >= p.desired_salary_min &&
          offered_salary <= p.desired_salary_max
      );
      if (!inRange) {
        return NextResponse.json(
          { error: "Offered salary must be within the candidate's desired range" },
          { status: 400 }
        );
      }
    }
  }

  // Create match (will fail on duplicate due to unique index)
  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      employer_id: session.user.id,
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

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { sendMatchAcceptedNotification } from "@/lib/email/send";
import { captureServerEvent } from "@/lib/analytics/server";

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

    // % the accepted salary sits above/below the regression median for this
    // role & experience — best-effort, the ticker works without it
    let deltaPct: number | null = null;
    if (match.offered_salary) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/salary-regression`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              vertical,
              years_exp: candidate?.years_exp_claimed ?? 0,
              location: candidate?.location ?? "Hong Kong",
              role: posting?.title ?? undefined,
            }),
          }
        );
        const d = await res.json();
        if (res.ok && typeof d.median_at_exp === "number" && d.median_at_exp > 0) {
          deltaPct =
            Math.round(((match.offered_salary - d.median_at_exp) / d.median_at_exp) * 1000) / 10;
        }
      } catch {
        // ignore — delta stays null
      }
    }

    await supabase.from("match_ticker_events").insert({
      vertical,
      role_label: posting?.title ? posting.title.toUpperCase() : "ENGINEER",
      salary: match.offered_salary ?? null,
      delta_pct: deltaPct,
      match_type: "match",
    });

    // Feed the accepted offer back into the salary regression dataset.
    // match_id has a partial unique index, so a retry/race on accept hits
    // 23505 instead of inserting a second point for this match.
    if (match.offered_salary && candidate?.years_exp_claimed != null) {
      const { data: salaryPoint, error: salaryPointError } = await supabase
        .from("salary_data_points")
        .insert({
          match_id: matchId,
          vertical,
          role_label: posting?.title ?? null,
          years_exp: candidate.years_exp_claimed,
          location: candidate.location,
          remote: posting ? posting.work_modes.includes("remote") : candidate.remote_only,
          monthly_salary: match.offered_salary,
          source: "match",
        })
        .select("id")
        .single();

      if (salaryPoint) {
        captureServerEvent("salary_datapoint_created", {
          match_id: matchId,
          salary_data_point_id: salaryPoint.id,
          vertical,
          role_label: posting?.title ?? null,
          years_exp: candidate.years_exp_claimed,
          monthly_salary: match.offered_salary,
        });
      } else if (salaryPointError && salaryPointError.code !== "23505") {
        console.error("salary_data_points insert failed:", salaryPointError);
      }
    }

    // Notify employer that the candidate accepted (best-effort, don't block the response)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name, email_notifications")
      .in("id", [match.employer_id, match.candidate_id]);

    const employerProfile = profiles?.find((p) => p.id === match.employer_id);
    const candidateProfile = profiles?.find((p) => p.id === match.candidate_id);

    if (employerProfile && candidateProfile && employerProfile.email_notifications !== false) {
      sendMatchAcceptedNotification({
        to: employerProfile.email,
        candidateName: candidateProfile.display_name,
      }).catch((err) => console.error("sendMatchAcceptedNotification failed:", err));
    }
  }

  return NextResponse.json({ status: newStatus });
}

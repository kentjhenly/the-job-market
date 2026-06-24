import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { sendHireOfferNotification, sendNewMessageNotification } from "@/lib/email/send";
import { readColumnUpdate } from "@/lib/utils/matchReads";
import { serverError, parseBody } from "@/lib/utils/api";
import { offerSchema } from "@/lib/utils/schemas";
import { triggerRecommendationScorer } from "@/lib/scoring/recommendation-scorer";

// Hire-offer flow, layered on top of an accepted match's chat:
//  - send            (employer)  — proposes a final salary, offer_status -> pending
//  - accept          (candidate) — confirms the hire, offer_status -> accepted, hired_at set
//  - decline         (candidate) — rejects a pending offer, offer_status -> declined
//  - withdraw        (employer)  — retracts a pending offer, offer_status -> declined
//  - renege          (candidate) — backs out after accepting, offer_status -> declined, hired_at cleared
//  - withdraw_match  (candidate) — exits the match entirely, status -> withdrawn
//  - decline_match   (employer)  — ends the match, status -> declined
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const parsed = await parseBody(request, offerSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const { action } = body;

  const supabase = getSupabaseServiceClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, employer_id, candidate_id, posting_id, status, offer_status, offer_salary, hired_at")
    .eq("id", matchId)
    .or(`employer_id.eq.${session.user.id},candidate_id.eq.${session.user.id}`)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status !== "accepted") {
    return NextResponse.json({ error: "Chat is not active for this match" }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (action === "withdraw_match") {
    if (match.candidate_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the candidate can withdraw from a match" },
        { status: 403 }
      );
    }
    if (match.hired_at) {
      return NextResponse.json({ error: "Cannot withdraw after being hired" }, { status: 409 });
    }

    await supabase
      .from("matches")
      .update({
        status: "withdrawn" as const,
        offer_status: match.offer_status === "pending" ? ("declined" as const) : undefined,
        offer_salary: null,
        last_message_at: now,
        ...readColumnUpdate(match, session.user.id, now),
      })
      .eq("id", matchId);

    await supabase.from("reputation_events").insert({
      subject_id: match.employer_id,
      actor_id: match.candidate_id,
      event_type: "candidate_withdrew",
      weight: 2,
      match_id: matchId,
    });

    triggerRecommendationScorer(match.candidate_id);

    {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, display_name, email_notifications")
        .in("id", [match.employer_id, match.candidate_id]);

      const employerProfile = profiles?.find((p) => p.id === match.employer_id);
      const candidateProfile = profiles?.find((p) => p.id === match.candidate_id);

      if (employerProfile && candidateProfile && employerProfile.email_notifications !== false) {
        sendNewMessageNotification({
          to: employerProfile.email,
          senderName: candidateProfile.display_name,
          matchUrl: `${process.env.NEXT_PUBLIC_APP_URL}/employer/matches`,
        }).catch((err) => console.error("sendNewMessageNotification (withdraw_match) failed:", err));
      }
    }

    return NextResponse.json({ status: "withdrawn" });
  }

  if (action === "decline_match") {
    if (match.employer_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the employer can decline a match" },
        { status: 403 }
      );
    }
    if (match.hired_at) {
      return NextResponse.json({ error: "Cannot decline after hiring" }, { status: 409 });
    }

    await supabase
      .from("matches")
      .update({
        status: "declined" as const,
        offer_status: match.offer_status === "pending" ? ("declined" as const) : undefined,
        offer_salary: null,
        last_message_at: now,
        ...readColumnUpdate(match, session.user.id, now),
      })
      .eq("id", matchId);

    {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, display_name, email_notifications")
        .in("id", [match.employer_id, match.candidate_id]);

      const employerProfile = profiles?.find((p) => p.id === match.employer_id);
      const candidateProfile = profiles?.find((p) => p.id === match.candidate_id);

      if (candidateProfile && candidateProfile.email_notifications !== false) {
        sendNewMessageNotification({
          to: candidateProfile.email,
          senderName: employerProfile?.display_name ?? "Employer",
          matchUrl: `${process.env.NEXT_PUBLIC_APP_URL}/candidate/matches`,
        }).catch((err) => console.error("sendNewMessageNotification (decline_match) failed:", err));
      }
    }

    return NextResponse.json({ status: "declined" });
  }

  if (action === "send") {
    if (match.employer_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the employer can send a hire offer" },
        { status: 403 }
      );
    }
    if (match.hired_at) {
      return NextResponse.json({ error: "This match is already hired" }, { status: 409 });
    }
    if (match.offer_status === "pending") {
      return NextResponse.json({ error: "An offer is already pending" }, { status: 409 });
    }

    const offeredSalary = Math.round(Number(body.offered_salary));
    if (!Number.isFinite(offeredSalary) || offeredSalary <= 0 || offeredSalary > 100_000_000) {
      return NextResponse.json(
        { error: "offered_salary must be a positive number within range" },
        { status: 400 }
      );
    }

    await supabase
      .from("matches")
      .update({
        offer_status: "pending",
        offer_salary: offeredSalary,
        offer_sent_at: now,
        last_message_at: now,
        ...readColumnUpdate(match, session.user.id, now),
      })
      .eq("id", matchId);

    const { data: message, error } = await supabase
      .from("match_messages")
      .insert({
        match_id: matchId,
        sender_id: session.user.id,
        body: JSON.stringify({ offered_salary: offeredSalary }),
        message_type: "offer",
      })
      .select("*")
      .single();

    if (error) return serverError("matches/offer", error);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name, email_notifications")
      .in("id", [match.employer_id, match.candidate_id]);

    const employerProfile = profiles?.find((p) => p.id === match.employer_id);
    const candidateProfile = profiles?.find((p) => p.id === match.candidate_id);

    if (employerProfile && candidateProfile && candidateProfile.email_notifications !== false) {
      sendHireOfferNotification({
        to: candidateProfile.email,
        companyName: employerProfile.display_name,
        offeredSalary,
      }).catch((err) => console.error("sendHireOfferNotification failed:", err));
    }

    return NextResponse.json({ offer_status: "pending", message });
  }

  if (action === "withdraw") {
    // Employer retracts their own pending offer.
    if (match.employer_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the employer can withdraw a hire offer" },
        { status: 403 }
      );
    }
    if (match.offer_status !== "pending") {
      return NextResponse.json({ error: "No pending offer to withdraw" }, { status: 409 });
    }

    await supabase
      .from("matches")
      .update({ offer_status: "declined", last_message_at: now, ...readColumnUpdate(match, session.user.id, now) })
      .eq("id", matchId);

    const { data: message, error } = await supabase
      .from("match_messages")
      .insert({
        match_id: matchId,
        sender_id: session.user.id,
        body: JSON.stringify({ offered_salary: match.offer_salary }),
        message_type: "offer_declined",
      })
      .select("*")
      .single();

    if (error) return serverError("matches/offer", error);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name, email_notifications")
      .in("id", [match.employer_id, match.candidate_id]);

    const candidateProfile = profiles?.find((p) => p.id === match.candidate_id);

    if (candidateProfile && candidateProfile.email_notifications !== false) {
      const employerProfile = profiles?.find((p) => p.id === match.employer_id);
      sendNewMessageNotification({
        to: candidateProfile.email,
        senderName: employerProfile?.display_name ?? "Employer",
        matchUrl: `${process.env.NEXT_PUBLIC_APP_URL}/candidate/matches`,
      }).catch((err) => console.error("sendNewMessageNotification (withdraw) failed:", err));
    }

    return NextResponse.json({ offer_status: "declined", message });
  }

  if (action === "renege") {
    if (match.candidate_id !== session.user.id) {
      return NextResponse.json(
        { error: "Only the candidate can renege on an accepted offer" },
        { status: 403 }
      );
    }
    if (match.offer_status !== "accepted" || !match.hired_at) {
      return NextResponse.json({ error: "No accepted offer to renege on" }, { status: 409 });
    }

    await supabase
      .from("matches")
      .update({
        status: "declined" as const,
        offer_status: "declined",
        hired_at: null,
        last_message_at: now,
        ...readColumnUpdate(match, session.user.id, now),
      })
      .eq("id", matchId);

    const { data: message, error } = await supabase
      .from("match_messages")
      .insert({
        match_id: matchId,
        sender_id: session.user.id,
        body: JSON.stringify({ offered_salary: match.offer_salary, reneged: true }),
        message_type: "offer_declined",
      })
      .select("*")
      .single();

    if (error) return serverError("matches/offer renege", error);

    // Reverse the completed_match reputation events from the original accept
    await supabase
      .from("reputation_events")
      .delete()
      .eq("match_id", matchId)
      .eq("event_type", "completed_match");

    triggerRecommendationScorer(match.candidate_id);

    // Remove the salary data point that was inserted on accept
    await supabase
      .from("salary_data_points")
      .delete()
      .eq("match_id", matchId);

    {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, display_name, email_notifications")
        .in("id", [match.employer_id, match.candidate_id]);

      const employerProfile = profiles?.find((p) => p.id === match.employer_id);
      const candidateProfile = profiles?.find((p) => p.id === match.candidate_id);

      if (employerProfile && candidateProfile && employerProfile.email_notifications !== false) {
        sendNewMessageNotification({
          to: employerProfile.email,
          senderName: candidateProfile.display_name,
          matchUrl: `${process.env.NEXT_PUBLIC_APP_URL}/employer/matches`,
        }).catch((err) => console.error("sendNewMessageNotification (renege) failed:", err));
      }
    }

    return NextResponse.json({ status: "declined", offer_status: "declined", reneged: true, message });
  }

  // accept / decline -- candidate responding to a pending offer
  if (match.candidate_id !== session.user.id) {
    return NextResponse.json(
      { error: "Only the candidate can respond to a hire offer" },
      { status: 403 }
    );
  }
  if (match.offer_status !== "pending") {
    return NextResponse.json({ error: "No pending offer to respond to" }, { status: 409 });
  }

  if (action === "accept") {
    await supabase
      .from("matches")
      .update({
        offer_status: "accepted",
        hired_at: now,
        last_message_at: now,
        ...readColumnUpdate(match, session.user.id, now),
      })
      .eq("id", matchId);

    const { data: message, error } = await supabase
      .from("match_messages")
      .insert({
        match_id: matchId,
        sender_id: session.user.id,
        body: JSON.stringify({ offered_salary: match.offer_salary }),
        message_type: "offer_accepted",
      })
      .select("*")
      .single();

    if (error) return serverError("matches/offer", error);

    // A completed hire is the strongest positive reputation signal for both sides
    await supabase.from("reputation_events").insert([
      {
        subject_id: match.employer_id,
        actor_id: match.candidate_id,
        event_type: "completed_match",
        weight: 2,
        match_id: matchId,
      },
      {
        subject_id: match.candidate_id,
        actor_id: match.employer_id,
        event_type: "completed_match",
        weight: 2,
        match_id: matchId,
      },
    ]);

    triggerRecommendationScorer(match.candidate_id);

    {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, display_name, email_notifications")
        .in("id", [match.employer_id, match.candidate_id]);

      const employerProfile = profiles?.find((p) => p.id === match.employer_id);
      const candidateProfile = profiles?.find((p) => p.id === match.candidate_id);

      if (employerProfile && candidateProfile && employerProfile.email_notifications !== false) {
        sendNewMessageNotification({
          to: employerProfile.email,
          senderName: candidateProfile.display_name,
          matchUrl: `${process.env.NEXT_PUBLIC_APP_URL}/employer/matches`,
        }).catch((err) => console.error("sendNewMessageNotification (offer accept) failed:", err));
      }
    }

    // Candidate got hired: remove the specific posting they were matched on
    const { data: fullMatch } = await supabase
      .from("matches")
      .select("candidate_posting_id")
      .eq("id", matchId)
      .single();
    if (fullMatch?.candidate_posting_id) {
      await supabase
        .from("candidate_job_postings")
        .delete()
        .eq("id", fullMatch.candidate_posting_id);
    }

    // If the employer posting has reached max_candidates hired, close it
    if (match.posting_id) {
      const [{ data: posting }, { count: hiredCount }] = await Promise.all([
        supabase
          .from("employer_job_postings")
          .select("max_candidates")
          .eq("id", match.posting_id)
          .single(),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("posting_id", match.posting_id)
          .not("hired_at", "is", null),
      ]);
      if (posting && hiredCount != null && hiredCount >= posting.max_candidates) {
        await supabase
          .from("employer_job_postings")
          .update({ status: "closed" })
          .eq("id", match.posting_id);

        // Auto-decline all remaining active matches on this now-filled posting
        await supabase
          .from("matches")
          .update({
            status: "declined" as const,
            offer_salary: null,
            offer_status: null,
            last_message_at: now,
          })
          .eq("posting_id", match.posting_id)
          .neq("id", matchId)
          .in("status", ["pending", "accepted"]);
      }
    }

    return NextResponse.json({ offer_status: "accepted", message });
  }

  // decline — candidate declines the offer (employer can send a new one)
  await supabase
    .from("matches")
    .update({ offer_status: "declined", last_message_at: now, ...readColumnUpdate(match, session.user.id, now) })
    .eq("id", matchId);

  const { data: message, error } = await supabase
    .from("match_messages")
    .insert({
      match_id: matchId,
      sender_id: session.user.id,
      body: JSON.stringify({ offered_salary: match.offer_salary }),
      message_type: "offer_declined",
    })
    .select("*")
    .single();

  if (error) return serverError("matches/offer decline", error);

  {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name, email_notifications")
      .in("id", [match.employer_id, match.candidate_id]);

    const employerProfile = profiles?.find((p) => p.id === match.employer_id);
    const candidateProfile = profiles?.find((p) => p.id === match.candidate_id);

    if (employerProfile && candidateProfile && employerProfile.email_notifications !== false) {
      sendNewMessageNotification({
        to: employerProfile.email,
        senderName: candidateProfile.display_name,
        matchUrl: `${process.env.NEXT_PUBLIC_APP_URL}/employer/matches`,
      }).catch((err) => console.error("sendNewMessageNotification (decline) failed:", err));
    }
  }

  return NextResponse.json({ offer_status: "declined", message });
}

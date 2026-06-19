"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimEnabler } from "@/components/providers/AnimEnabler";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ScoreBar } from "@/components/charts/ScoreBar";
import { MatchedCandidatesPanel } from "../MatchedCandidatesPanel";
import { formatSalary, formatPercentile } from "@/lib/utils/formatters";
import { WORK_MODES, verticalLabel } from "@/lib/utils/constants";
import type { Database } from "@/lib/supabase/types";

type EmployerPosting = Database["public"]["Tables"]["employer_job_postings"]["Row"];

interface LobbyMatch {
  id: string;
  candidate_id: string;
  status: string;
  offered_salary: number | null;
  created_at: string;
  expires_at: string | null;
  offer_status: string | null;
  hired_at: string | null;
  last_message_at: string | null;
  employer_last_read_at: string | null;
  display_name: string | null;
  composite_score: number;
  percentile_rank: number;
}

interface Props {
  posting: EmployerPosting;
  initialMatches: LobbyMatch[];
}

function statusBadge(m: LobbyMatch) {
  if (m.hired_at) return <Badge variant="gold">HIRED</Badge>;
  if (m.status === "pending") return <Badge variant="muted">PENDING</Badge>;
  if (m.status === "accepted") return <Badge variant="up">ACCEPTED</Badge>;
  if (m.status === "declined") return <Badge variant="down">DECLINED</Badge>;
  if (m.status === "ghosted") return <Badge variant="down">GHOSTED</Badge>;
  return <Badge variant="muted">{m.status.toUpperCase()}</Badge>;
}

export function PostingLobbyClient({ posting, initialMatches }: Props) {
  const router = useRouter();
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [closeStep, setCloseStep] = useState(0);
  const [closeConfirmed, setCloseConfirmed] = useState(false);
  const [closing, setClosing] = useState(false);

  const isClosed = posting.status === "closed";

  function openRecruit() { setRecruitOpen(true); }
  function closeRecruit() {
    setRecruitOpen(false);
    if (needsRefresh) {
      setNeedsRefresh(false);
      router.refresh();
    }
  }

  async function confirmClose() {
    if (!closeConfirmed) return;
    setClosing(true);
    const res = await fetch(`/api/recruiter-postings/${posting.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    setClosing(false);
    if (res.ok) {
      setCloseStep(0);
      setCloseConfirmed(false);
      router.refresh();
    }
  }

  const activeCount = initialMatches.filter((m) => m.status === "pending" || m.status === "accepted").length;
  const hiredCount = initialMatches.filter((m) => m.hired_at != null).length;

  return (
    <>
      <AnimEnabler />

      <div className="view-enter space-y-4">
        <div>
          <Link href="/recruiter/postings" className="link-up mono" style={{ fontSize: 11 }}>
            ← BACK TO OPENINGS
          </Link>
        </div>

        {/* opening header */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <span className="panel-title">{posting.title}</span>
              <p className="mono mt-0.5" style={{ fontSize: 11, color: "var(--muted)" }}>
                {verticalLabel(posting.vertical)} · {posting.location ?? "LOCATION NOT SET"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {posting.work_modes.map((mode) => (
                <Badge key={mode} variant="muted">
                  {WORK_MODES.find((w) => w.value === mode)?.label ?? mode}
                </Badge>
              ))}
              <Link
                href={`/recruiter/postings/${posting.id}/edit`}
                className="mono"
                style={{ fontSize: 11, color: "var(--up)" }}
              >
                EDIT →
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-4 pt-1 pb-4">
            {posting.years_exp_min != null && posting.years_exp_max != null && (
              <span className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>
                {posting.years_exp_min}–{posting.years_exp_max} YRS EXP
              </span>
            )}
            {posting.salary_max != null && (
              <span className="mono tnum" style={{ fontSize: 11, color: "var(--up)" }}>
                UP TO {formatSalary(posting.salary_max)}
              </span>
            )}
            {posting.skills.slice(0, 6).map((skill) => (
              <Badge key={skill} variant="outline">{skill}</Badge>
            ))}
          </div>
        </div>

        {/* recruited candidates */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">RECRUITED</span>
            <span className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>
              {activeCount} ACTIVE · {hiredCount} HIRED
            </span>
          </div>

          {initialMatches.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="kicker">NO CANDIDATES RECRUITED YET</p>
              <p className="mono mt-2" style={{ fontSize: 11, color: "var(--dim)" }}>
                USE THE RECRUIT BUTTON BELOW TO SEND PITCHES
              </p>
            </div>
          ) : (
            <div>
              {initialMatches.map((m, idx) => {
                const hoursLeft =
                  m.expires_at && m.status === "pending"
                    ? Math.max(0, Math.round((new Date(m.expires_at).getTime() - Date.now()) / 3600000))
                    : null;
                const hasUnread =
                  m.last_message_at != null &&
                  (m.employer_last_read_at == null ||
                    new Date(m.last_message_at) > new Date(m.employer_last_read_at));

                return (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 p-4"
                    style={{
                      borderBottom: idx === initialMatches.length - 1 ? "none" : "1px solid var(--border-soft)",
                    }}
                  >
                    <span
                      className="mono tnum mt-0.5 shrink-0"
                      style={{ fontSize: 12, color: "var(--muted)", minWidth: 16 }}
                    >
                      {idx + 1}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="mono truncate" style={{ fontSize: 13, color: "var(--text)" }}>
                          {m.display_name ?? `CAND-${m.candidate_id.slice(0, 6).toUpperCase()}`}
                          {hasUnread && (
                            <span
                              className="live-dot ml-2"
                              style={{ display: "inline-block", verticalAlign: "middle" }}
                            />
                          )}
                        </p>
                        {statusBadge(m)}
                      </div>

                      <ScoreBar score={m.composite_score} />

                      <p className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>
                        SCORE {m.composite_score.toFixed(1)} · {formatPercentile(m.percentile_rank)}
                      </p>

                      {m.offered_salary != null && (
                        <p className="mono tnum" style={{ fontSize: 11, color: "var(--up)" }}>
                          OFFERED {formatSalary(m.offered_salary)}
                        </p>
                      )}

                      {hoursLeft != null && (
                        <p
                          className="mono tnum"
                          style={{ fontSize: 11, color: hoursLeft < 12 ? "var(--down)" : "var(--muted)" }}
                        >
                          EXPIRES IN {hoursLeft}H
                        </p>
                      )}

                      {m.offer_status === "pending" && (
                        <p className="mono" style={{ fontSize: 11, color: "var(--gold)" }}>
                          HIRE OFFER SENT
                        </p>
                      )}
                    </div>

                    {m.status === "accepted" && (
                      <Link
                        href="/recruiter/matches"
                        className="mono shrink-0"
                        style={{ fontSize: 11, color: "var(--up)" }}
                      >
                        CHAT →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button onClick={openRecruit} disabled={isClosed}>
            RECRUIT
          </Button>
          {isClosed ? (
            <span className="badge badge-muted">CLOSED</span>
          ) : (
            <Button variant="danger" onClick={() => setCloseStep(1)}>
              CLOSE OPENING
            </Button>
          )}
        </div>
      </div>

      {/* recruit slide-over */}
      {recruitOpen && (
        <div
          className="slideover-panel"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            height: "100vh",
            width: "min(480px, 100vw)",
            overflowY: "auto",
            zIndex: 50,
            background: "var(--bg)",
            borderLeft: "1px solid var(--border-soft)",
          }}
        >
          <MatchedCandidatesPanel
            postingId={posting.id}
            postingSkills={posting.skills ?? []}
            onPitchSent={() => setNeedsRefresh(true)}
            onClose={closeRecruit}
          />
        </div>
      )}

      {/* close opening modal */}
      <Modal
        open={closeStep > 0}
        onClose={() => { setCloseStep(0); setCloseConfirmed(false); }}
        title="CLOSE OPENING"
      >
        {closeStep === 1 && (
          <div className="space-y-4">
            <p className="mono" style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.6 }}>
              Closing &quot;{posting.title}&quot; will stop new candidates from being matched to it and prevent new pitches from being sent.
            </p>
            <p className="mono" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
              Existing pitches and active conversations will not be affected.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setCloseStep(2)}>PROCEED →</Button>
              <Button variant="ghost" onClick={() => setCloseStep(0)}>CANCEL</Button>
            </div>
          </div>
        )}
        {closeStep === 2 && (
          <div className="space-y-4">
            <p className="mono" style={{ fontSize: 12, color: "var(--down)", lineHeight: 1.6 }}>
              This will permanently close the opening. You cannot reopen it from this screen.
            </p>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={closeConfirmed}
                onChange={(e) => setCloseConfirmed(e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <span className="mono" style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.6 }}>
                I understand this opening will be closed and no further candidates will be matched to it.
              </span>
            </label>
            <div className="flex gap-3">
              <Button variant="danger" disabled={!closeConfirmed} onClick={confirmClose} loading={closing}>
                CLOSE OPENING
              </Button>
              <Button variant="ghost" onClick={() => { setCloseStep(0); setCloseConfirmed(false); }}>
                CANCEL
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

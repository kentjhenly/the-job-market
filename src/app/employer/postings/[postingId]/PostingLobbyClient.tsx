"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimEnabler } from "@/components/providers/AnimEnabler";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/terminal/DataRow";
import { MatchChat } from "@/components/terminal/MatchChat";
import { Modal } from "@/components/ui/Modal";
import { ScoreBar } from "@/components/charts/ScoreBar";
import { SkillBadges } from "@/components/ui/SkillBadges";
import { formatSalary, formatPercentile, formatRelativeTime } from "@/lib/utils/formatters";
import { scoreBadgeVariant, repBadgeVariant } from "@/lib/utils/score";
import { WORK_MODES, verticalLabel } from "@/lib/utils/constants";
import type { Database } from "@/lib/supabase/types";

type EmployerPosting = Database["public"]["Tables"]["employer_job_postings"]["Row"];

function linkHostname(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface LobbyMatch {
  id: string;
  candidate_id: string;
  status: string;
  offered_salary: number | null;
  pitch_message: string | null;
  created_at: string;
  expires_at: string | null;
  offer_status: string | null;
  hired_at: string | null;
  last_message_at: string | null;
  employer_last_read_at: string | null;
  candidate_last_read_at: string | null;
  display_name: string | null;
  composite_score: number;
  percentile_rank: number;
  years_exp_claimed: number | null;
  reputation_score: number | null;
  location: string | null;
  portfolio: {
    id: string;
    title: string;
    description: string | null;
    link_url: string | null;
    file_name: string | null;
    skills: string[];
  }[];
}

interface Props {
  posting: EmployerPosting;
  initialMatches: LobbyMatch[];
  canEdit: boolean;
}

function statusBadge(m: LobbyMatch) {
  if (m.hired_at) return <Badge variant="gold">HIRED</Badge>;
  if (m.status === "pending") return <Badge variant="muted">PENDING</Badge>;
  if (m.status === "accepted") return <Badge variant="up">ACCEPTED</Badge>;
  if (m.status === "declined") return <Badge variant="down">DECLINED</Badge>;
  if (m.status === "ghosted") return <Badge variant="down">GHOSTED</Badge>;
  return <Badge variant="muted">{m.status.toUpperCase()}</Badge>;
}

export function PostingLobbyClient({ posting, initialMatches, canEdit }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatMatchId, setChatMatchId] = useState<string | null>(null);
  const [closeStep, setCloseStep] = useState(0);
  const [closeConfirmed, setCloseConfirmed] = useState(false);
  const [closing, setClosing] = useState(false);

  const selected = initialMatches.find((m) => m.id === selectedId) ?? null;
  const chatMatch = initialMatches.find((m) => m.id === chatMatchId) ?? null;

  function openChat(m: LobbyMatch) {
    setChatMatchId(m.id);
    setSelectedId(null);
  }

  const isClosed = posting.status === "closed";

  async function confirmClose() {
    if (!closeConfirmed) return;
    setClosing(true);
    const res = await fetch(`/api/employer-postings/${posting.id}`, {
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
          <Link href="/employer/postings" className="link-up mono" style={{ fontSize: 11 }}>
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
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-4 pt-3 pb-4">
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

        <div className="flex items-center justify-between">
          <Button
            onClick={() => router.push(`/employer/postings/${posting.id}/edit`)}
            disabled={!canEdit}
            title={canEdit ? undefined : "Subscription required to edit"}
          >
            EDIT
          </Button>
          {isClosed ? (
            <span className="badge badge-muted">CLOSED</span>
          ) : (
            <Button variant="danger" onClick={() => setCloseStep(1)}>
              DELETE
            </Button>
          )}
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
                const hasUnreadChat =
                  m.last_message_at != null &&
                  (m.employer_last_read_at == null ||
                    new Date(m.last_message_at) > new Date(m.employer_last_read_at));
                const pitchUnseen =
                  m.status === "pending" && m.candidate_last_read_at == null;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                    style={{
                      borderBottom: idx === initialMatches.length - 1 ? "none" : "1px solid var(--border-soft)",
                      borderLeft: `2px solid ${m.id === selectedId ? "var(--up)" : "transparent"}`,
                      background: m.id === selectedId ? "var(--up-dim)" : undefined,
                    }}
                  >
                    <div className="flex shrink-0 items-center justify-center" style={{ width: 10 }}>
                      {(pitchUnseen || hasUnreadChat) && (
                        <span
                          className="live-dot"
                          title={pitchUnseen ? "Candidate has not opened this pitch" : "New message"}
                        />
                      )}
                    </div>

                    <span
                      className="mono tnum shrink-0"
                      style={{ fontSize: 12, color: "var(--muted)", minWidth: 16 }}
                    >
                      {idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="mono truncate" style={{ fontSize: 13, color: "var(--text)" }}>
                            {m.display_name ?? `CAND-${m.candidate_id.slice(0, 6).toUpperCase()}`}
                          </p>
                          <ScoreBar score={m.composite_score} />
                        </div>

                        <div className="flex shrink-0 items-center gap-4">
                          <div className="space-y-0.5 text-right">
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
                          <div className="flex shrink-0 items-center gap-3">
                            {statusBadge(m)}
                            {m.status === "accepted" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openChat(m); }}
                                className="btn btn-sm"
                                style={{ fontSize: 10.5, whiteSpace: "nowrap", background: "color-mix(in oklch, var(--up) 15%, transparent)", color: "var(--up)", border: "1px solid color-mix(in oklch, var(--up) 40%, transparent)" }}
                              >
                                CHAT →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Link href={`/employer/postings/${posting.id}/recruit`}>
          <Button disabled={isClosed}>RECRUIT</Button>
        </Link>
      </div>

      {/* candidate detail slide-over */}
      {selected && (
        <div
          className="slideover-panel flex flex-col"
          style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
        >
          <div className="panel-head">
            <span className="panel-title">CANDIDATE DETAIL</span>
            <button onClick={() => setSelectedId(null)} className="btn btn-ghost btn-sm">
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-auto p-4">
            <div className="flex items-center justify-between">
              <span className="mono" style={{ fontSize: 16, color: "var(--text)", fontWeight: 600 }}>
                {selected.display_name ?? `CAND-${selected.candidate_id.slice(0, 6).toUpperCase()}`}
              </span>
              {statusBadge(selected)}
            </div>

            <div>
              <DataRow label="COMPOSITE SCORE" value={selected.composite_score.toFixed(1)} color={scoreBadgeVariant(selected.composite_score)} />
              <DataRow label="PERCENTILE" value={formatPercentile(selected.percentile_rank)} color={scoreBadgeVariant(selected.percentile_rank)} />
              <DataRow
                label="EXPERIENCE"
                value={selected.years_exp_claimed != null ? `${selected.years_exp_claimed} YRS` : "NOT DISCLOSED"}
              />
              <DataRow label="LOCATION" value={selected.location ?? "NOT DISCLOSED"} />
              <DataRow
                label="REPUTATION"
                value={`${(selected.reputation_score ?? 100).toFixed(0)}/100`}
                color={repBadgeVariant(selected.reputation_score ?? 100)}
              />
            </div>

            {selected.offered_salary != null && (
              <div>
                <DataRow label="OFFERED SALARY" value={formatSalary(selected.offered_salary)} color="up" />
              </div>
            )}

            <div>
              <DataRow label="SENT" value={formatRelativeTime(selected.created_at)} />
              {selected.status === "pending" && selected.expires_at && (
                <DataRow label="EXPIRES" value={formatRelativeTime(selected.expires_at)} color="gold" />
              )}
            </div>

            {selected.pitch_message && (
              <div>
                <p className="kicker mb-2">PITCH MESSAGE</p>
                <p className="mono" style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
                  {selected.pitch_message}
                </p>
              </div>
            )}

            {selected.portfolio.length > 0 && (
              <div>
                <p className="kicker mb-2">PORTFOLIO ({selected.portfolio.length})</p>
                <div className="space-y-2">
                  {selected.portfolio.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-md p-3"
                      style={{ border: "1px solid var(--border-soft)", background: "var(--surface-2)" }}
                    >
                      <p className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                        {p.title}
                      </p>
                      {p.description && (
                        <p
                          className="mono mt-1"
                          style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                        >
                          {p.description}
                        </p>
                      )}
                      {(p.file_name || p.link_url) && (
                        <p className="mono mt-1 truncate" style={{ fontSize: 10.5, color: "var(--muted)" }}>
                          {p.file_name ?? linkHostname(p.link_url!)}
                        </p>
                      )}
                      {p.skills.length > 0 && (
                        <div className="mt-2">
                          <SkillBadges skills={p.skills} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.status === "accepted" && (
              <Button variant="primary" className="w-full" onClick={() => openChat(selected)}>
                OPEN CHAT →
              </Button>
            )}
          </div>
        </div>
      )}

      {/* chat slide-over */}
      {chatMatch && (
        <div
          className="slideover-panel flex flex-col"
          style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
        >
          <div className="panel-head">
            <span className="panel-title">CHAT</span>
            <button onClick={() => setChatMatchId(null)} className="btn btn-ghost btn-sm">
              ✕
            </button>
          </div>
          <MatchChat
            matchId={chatMatch.id}
            counterpartLabel={chatMatch.display_name ?? `CAND-${chatMatch.candidate_id.slice(0, 6).toUpperCase()}`}
            counterpartSubLabel={`SCORE ${chatMatch.composite_score.toFixed(1)} · ${formatPercentile(chatMatch.percentile_rank).toUpperCase()}`}
            offeredSalary={chatMatch.offered_salary}
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

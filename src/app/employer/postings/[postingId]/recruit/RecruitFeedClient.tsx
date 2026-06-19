"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataRow } from "@/components/terminal/DataRow";
import { ScoreBar } from "@/components/charts/ScoreBar";
import { formatSalary, formatSalaryBand, formatPercentile } from "@/lib/utils/formatters";
import { scoreBadgeVariant, scoreVar } from "@/lib/utils/score";

interface MatchedCandidate {
  candidate_id: string;
  candidate_posting_id: string;
  display_name: string | null;
  composite_score: number;
  percentile_rank: number;
  years_exp_claimed: number | null;
  posting_title: string;
  location: string | null;
  work_modes: string[];
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  skills: string[];
  portfolio_skills: string[];
  match_score: number;
  match_percentile?: number;
}

interface CandidatesResponse {
  matches: MatchedCandidate[];
  pitchedCandidateIds: string[];
  capacity: { max: number; active: number };
}

interface Props {
  postingId: string;
  postingTitle: string;
  postingSkills: string[];
}

const RECRUIT_MAX = 10;
const MAX_RESULTS = 50;
const PAGE_SIZE = 10;
const COLUMNS = "2.5rem 1.4fr 10rem 4.5rem 4.5rem 4.5rem 9rem 7.5rem 4.5rem";
const HEADERS = ["#", "CANDIDATE", "ROLE", "OVERALL", "COMPOSITE", "SKILL", "SALARY RANGE", "PERCENTILE", "RECRUIT"];

function skillScore(candidate: MatchedCandidate, postingSkills: string[]): number {
  if (postingSkills.length === 0) return 0;
  let sum = 0;
  const portfolioSet = new Set(candidate.portfolio_skills);
  for (const skill of postingSkills) {
    if (candidate.skills.includes(skill)) {
      sum += portfolioSet.has(skill) ? 1 : 0.5;
    }
  }
  return (sum / postingSkills.length) * 100;
}

function overallScore(m: MatchedCandidate, postingSkills: string[]) {
  return (m.composite_score + skillScore(m, postingSkills)) / 2;
}

export function RecruitFeedClient({ postingId, postingTitle, postingSkills }: Props) {
  const [data, setData] = useState<CandidatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<MatchedCandidate | null>(null);
  const [pitchTarget, setPitchTarget] = useState<MatchedCandidate | null>(null);
  const [pitchMsg, setPitchMsg] = useState("");
  const [pitchSalary, setPitchSalary] = useState("");
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(0);
  const [pitchResult, setPitchResult] = useState<"success" | "error" | null>(null);
  const [pitchError, setPitchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/employer-postings/${postingId}/candidates`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [postingId]);

  async function sendPitch() {
    if (!pitchTarget) return;
    setSending(true);
    setPitchResult(null);
    setPitchError(null);

    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_id: pitchTarget.candidate_id,
        posting_id: postingId,
        pitch_message: pitchMsg,
        offered_salary: pitchSalary ? Math.round(parseFloat(pitchSalary) * 100) : null,
      }),
    });

    if (res.ok) {
      setPitchMsg("");
      setPitchSalary("");
      if (selected?.candidate_id === pitchTarget.candidate_id) setSelected(null);
      setData((prev) =>
        prev
          ? {
              ...prev,
              pitchedCandidateIds: [...prev.pitchedCandidateIds, pitchTarget.candidate_id],
              capacity: { ...prev.capacity, active: prev.capacity.active + 1 },
            }
          : prev
      );
      setPitchTarget(null);
    } else {
      const json = await res.json().catch(() => ({}));
      setPitchError(json.error ?? "PITCH FAILED");
      setPitchResult("error");
    }
    setSending(false);
  }

  const pitchedSet = data ? new Set(data.pitchedCandidateIds) : new Set<string>();
  const activeCount = data ? data.capacity.active : 0;
  const slotsRemaining = RECRUIT_MAX - activeCount;
  const atCapacity = slotsRemaining <= 0;

  const offerCents = pitchSalary ? Math.round(parseFloat(pitchSalary) * 100) : null;
  const salaryInRange =
    offerCents != null &&
    pitchTarget != null &&
    (pitchTarget.desired_salary_min == null || offerCents >= pitchTarget.desired_salary_min) &&
    (pitchTarget.desired_salary_max == null || offerCents <= pitchTarget.desired_salary_max);

  const allVisible = data
    ? data.matches
        .filter((m) => !pitchedSet.has(m.candidate_id) && skillScore(m, postingSkills) > 0)
        .sort((a, b) => overallScore(b, postingSkills) - overallScore(a, postingSkills))
        .slice(0, MAX_RESULTS)
    : [];
  const totalPages = Math.ceil(allVisible.length / PAGE_SIZE);
  const pageItems = allVisible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function skillOverlap(candidateSkills: string[]): { matching: number; total: number } {
    if (postingSkills.length === 0) return { matching: 0, total: 0 };
    const matching = candidateSkills.filter((s) => postingSkills.includes(s)).length;
    return { matching, total: postingSkills.length };
  }

  return (
    <div className="view-enter space-y-4">
      <div>
        <Link href={`/employer/postings/${postingId}`} className="link-up mono" style={{ fontSize: 11 }}>
          &larr; BACK TO OPENING
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="mono" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
            CANDIDATE FEED
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="mono tnum"
            style={{ fontSize: 11, color: atCapacity ? "var(--down)" : "var(--muted)" }}
          >
            {activeCount}/{RECRUIT_MAX} RECRUITED
          </span>
          {!atCapacity && (
            <Badge variant="up">
              {slotsRemaining} SLOT{slotsRemaining !== 1 ? "S" : ""} OPEN
            </Badge>
          )}
          {atCapacity && <Badge variant="down">AT CAPACITY</Badge>}
        </div>
      </div>

      {loading && (
        <div className="panel px-4 py-12 text-center">
          <p className="kicker">LOADING CANDIDATES...</p>
        </div>
      )}

      {error && (
        <div className="panel px-4 py-12 text-center">
          <p className="kicker" style={{ color: "var(--down)" }}>FAILED TO LOAD CANDIDATES</p>
        </div>
      )}

      {data && (
        <div className="panel overflow-hidden" style={{ borderTop: "2px solid var(--gold)" }}>
          <div
            className="grid items-center gap-3 py-2.5 pl-4 pr-6"
            style={{ gridTemplateColumns: COLUMNS, borderBottom: "1px solid var(--border-soft)" }}
          >
            {HEADERS.map((h) => (
              <span key={h} className="kicker">{h}</span>
            ))}
          </div>

          {pageItems.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="kicker">NO MATCHING CANDIDATES YET</p>
              <p className="mono mt-2" style={{ fontSize: 11, color: "var(--dim)" }}>
                CANDIDATES APPEAR AS THEY POST ROLES MATCHING YOUR CRITERIA
              </p>
            </div>
          ) : (
            pageItems.map((m, idx) => {
              const isSelected = selected?.candidate_id === m.candidate_id;
              const overall = overallScore(m, postingSkills);
              const globalIdx = page * PAGE_SIZE + idx;
              return (
                <div
                  key={m.candidate_posting_id}
                  onClick={() => setSelected(m)}
                  className="grid cursor-pointer items-center gap-3 py-3 pl-4 pr-6 transition-colors hover:bg-surface-2"
                  style={{
                    gridTemplateColumns: COLUMNS,
                    borderBottom: idx === pageItems.length - 1 ? "none" : "1px solid var(--border-soft)",
                    borderLeft: `2px solid ${isSelected ? "var(--up)" : "transparent"}`,
                    background: isSelected ? "var(--up-dim)" : "transparent",
                  }}
                >
                  <span className="mono tnum" style={{ fontSize: 12, color: "var(--muted)" }}>
                    {String(globalIdx + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <p
                      className="mono flex items-center gap-1.5 truncate"
                      style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}
                    >
                      <span className="truncate">
                        {m.display_name ?? `CAND-${m.candidate_id.slice(0, 4).toUpperCase()}`}
                      </span>
                    </p>
                    <div className="mt-1.5">
                      <ScoreBar score={overall} />
                    </div>
                  </div>

                  <span className="mono truncate" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {m.posting_title.toUpperCase()}
                  </span>

                  <span className="mono tnum" style={{ fontSize: 13, color: scoreVar(overall), fontWeight: 600 }}>
                    {overall.toFixed(1)}
                  </span>

                  <span className="mono tnum" style={{ fontSize: 13, color: scoreVar(m.composite_score), fontWeight: 600 }}>
                    {m.composite_score.toFixed(1)}
                  </span>

                  <span className="mono tnum" style={{ fontSize: 13, color: scoreVar(skillScore(m, postingSkills)), fontWeight: 600 }}>
                    {skillScore(m, postingSkills).toFixed(1)}
                  </span>

                  <span className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {m.desired_salary_min != null && m.desired_salary_max != null
                      ? formatSalaryBand(m.desired_salary_min, m.desired_salary_max)
                      : "—"}
                  </span>

                  <span className="mono tnum" style={{ fontSize: 11, color: scoreVar(m.percentile_rank) }}>
                    {formatPercentile(m.percentile_rank)}
                  </span>

                  <div className="flex justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPitchTarget(m);
                        setPitchResult(null);
                        setPitchError(null);
                        setPitchMsg("");
                        setPitchSalary("");
                      }}
                      disabled={atCapacity}
                      className="mono flex h-7 w-7 items-center justify-center rounded transition-colors"
                      style={{
                        fontSize: 18,
                        lineHeight: 1,
                        color: atCapacity ? "var(--dim)" : "var(--up)",
                        border: `1px solid ${atCapacity ? "var(--border-soft)" : "color-mix(in oklch, var(--up) 40%, transparent)"}`,
                        background: "transparent",
                        cursor: atCapacity ? "not-allowed" : "pointer",
                      }}
                      title="Add to recruit list"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "1px solid var(--border-soft)" }}
            >
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="mono"
                style={{
                  fontSize: 11,
                  color: page === 0 ? "var(--dim)" : "var(--up)",
                  cursor: page === 0 ? "default" : "pointer",
                  background: "none",
                  border: "none",
                }}
              >
                &larr; PREV
              </button>
              <span className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="mono"
                style={{
                  fontSize: 11,
                  color: page >= totalPages - 1 ? "var(--dim)" : "var(--up)",
                  cursor: page >= totalPages - 1 ? "default" : "pointer",
                  background: "none",
                  border: "none",
                }}
              >
                NEXT &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div
          className="slideover-panel fixed top-0 right-0 bottom-0 z-40 flex w-96 flex-col"
          style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
        >
          <div className="panel-head">
            <span className="panel-title">CANDIDATE DETAIL</span>
            <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm">
              &#x2715;
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-auto p-4">
            <div>
              <p className="mono" style={{ fontSize: 13, color: "var(--text)" }}>
                {selected.display_name ?? `CAND-${selected.candidate_id.slice(0, 8).toUpperCase()}`}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={scoreBadgeVariant(overallScore(selected, postingSkills))}>
                  OVERALL {overallScore(selected, postingSkills).toFixed(1)}
                </Badge>
                {selected.match_percentile != null && (
                  <Badge variant="up">P{selected.match_percentile}</Badge>
                )}
              </div>
            </div>

            <div>
              <DataRow label="OVERALL SCORE" value={overallScore(selected, postingSkills).toFixed(1)} color={scoreBadgeVariant(overallScore(selected, postingSkills))} />
              <DataRow label="COMPOSITE SCORE" value={selected.composite_score.toFixed(1)} color={scoreBadgeVariant(selected.composite_score)} />
              <DataRow label="SKILL SCORE" value={skillScore(selected, postingSkills).toFixed(1)} color={scoreBadgeVariant(skillScore(selected, postingSkills))} />
              <DataRow label="PERCENTILE" value={formatPercentile(selected.percentile_rank)} color={scoreBadgeVariant(selected.percentile_rank)} />
              <DataRow label="ROLE" value={selected.posting_title} />
              <DataRow
                label="EXPERIENCE"
                value={selected.years_exp_claimed != null ? `${selected.years_exp_claimed} YRS` : "NOT DISCLOSED"}
              />
              <DataRow
                label="SALARY RANGE"
                value={
                  selected.desired_salary_min != null && selected.desired_salary_max != null
                    ? formatSalaryBand(selected.desired_salary_min, selected.desired_salary_max)
                    : "NOT DISCLOSED"
                }
              />
              <DataRow label="LOCATION" value={selected.location ?? "NOT DISCLOSED"} />
              <DataRow label="WORK MODES" value={selected.work_modes.length > 0 ? selected.work_modes.join(", ").toUpperCase() : "NOT SET"} />
            </div>

            {selected.skills.length > 0 && (
              <div>
                <p className="kicker mb-2">SKILLS</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.skills.map((skill) => {
                    const isMatch = postingSkills.includes(skill);
                    return (
                      <Badge key={skill} variant={isMatch ? "up" : "outline"}>
                        {skill}
                      </Badge>
                    );
                  })}
                </div>
                {postingSkills.length > 0 && (
                  <p className="mono tnum mt-2" style={{ fontSize: 10, color: "var(--dim)" }}>
                    {skillOverlap(selected.skills).matching}/{skillOverlap(selected.skills).total} REQUIRED SKILLS MATCHED
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
            <Button
              onClick={() => {
                setPitchTarget(selected);
                setPitchResult(null);
                setPitchError(null);
                setPitchMsg("");
                setPitchSalary("");
              }}
              className="w-full"
              disabled={atCapacity}
            >
              {atCapacity ? "AT CAPACITY" : "RECRUIT →"}
            </Button>
          </div>
        </div>
      )}

      <Modal open={!!pitchTarget} onClose={() => setPitchTarget(null)} title="RECRUIT CANDIDATE">
        <div className="space-y-4">
          <p className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            RECRUITING:{" "}
            <span style={{ color: "var(--text)" }}>
              {pitchTarget?.display_name ?? "CANDIDATE"}
            </span>
          </p>

          <div>
            <label className="kicker mb-1.5 block">PITCH MESSAGE</label>
            <textarea
              value={pitchMsg}
              onChange={(e) => setPitchMsg(e.target.value)}
              rows={4}
              className="field"
            />
          </div>

          <div>
            <label className="kicker mb-1.5 block">OFFERED SALARY (HKD/MONTH)</label>
            <input
              type="number"
              value={pitchSalary}
              onChange={(e) => setPitchSalary(e.target.value)}
              className="field"
              required
            />
            {pitchTarget?.desired_salary_min != null && pitchTarget?.desired_salary_max != null && (
              <p className="mono tnum mt-1" style={{ fontSize: 11, color: offerCents == null ? "var(--muted)" : salaryInRange ? "var(--up)" : "var(--down)" }}>
                CANDIDATE RANGE: {formatSalary(pitchTarget.desired_salary_min)} &ndash; {formatSalary(pitchTarget.desired_salary_max)}
              </p>
            )}
          </div>

          {pitchResult === "error" && (
            <div
              className="rounded p-3"
              style={{
                border: "1px solid color-mix(in oklch, var(--down) 40%, transparent)",
                background: "var(--down-dim)",
              }}
            >
              <p className="mono" style={{ fontSize: 11, color: "var(--down)" }}>
                {pitchError ?? "PITCH FAILED"}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={sendPitch} loading={sending} disabled={!offerCents || !salaryInRange}>
              SEND PITCH
            </Button>
            <Button variant="ghost" onClick={() => setPitchTarget(null)}>
              CANCEL
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

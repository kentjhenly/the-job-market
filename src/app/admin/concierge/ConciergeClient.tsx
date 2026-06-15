"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ScoreBar } from "@/components/charts/ScoreBar";
import { formatSalaryBand, formatPercentile, formatShortDate } from "@/lib/utils/formatters";
import type { CandidateForVerification, PostingWithEmployer } from "./page";

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
  match_score: number;
  match_percentile?: number;
}

interface CandidatesResponse {
  matches: MatchedCandidate[];
  pitchedCandidateIds: string[];
  capacity: { max: number; active: number };
}

interface Props {
  postings: PostingWithEmployer[];
  matchSalaryPointCount: number;
  candidates: CandidateForVerification[];
}

export function ConciergeClient({ postings, matchSalaryPointCount, candidates }: Props) {
  const [selected, setSelected] = useState<PostingWithEmployer | null>(null);
  const [data, setData] = useState<CandidatesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pitchTarget, setPitchTarget] = useState<MatchedCandidate | null>(null);
  const [pitchMsg, setPitchMsg] = useState("");
  const [pitchSalary, setPitchSalary] = useState("");
  const [sending, setSending] = useState(false);
  const [pitchResult, setPitchResult] = useState<"success" | "error" | null>(null);
  const [pitchError, setPitchError] = useState<string | null>(null);
  const [candidateList, setCandidateList] = useState(candidates);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  async function toggleVerified(candidate: CandidateForVerification) {
    setVerifyingId(candidate.id);
    const next = !candidate.is_founder_verified;

    const res = await fetch(`/api/admin/candidates/${candidate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_founder_verified: next }),
    });

    if (res.ok) {
      setCandidateList((prev) =>
        prev.map((c) => (c.id === candidate.id ? { ...c, is_founder_verified: next } : c))
      );
    }
    setVerifyingId(null);
  }

  const filteredCandidates = candidateSearch.trim()
    ? candidateList.filter((c) =>
        (c.profiles?.display_name ?? c.id).toLowerCase().includes(candidateSearch.trim().toLowerCase())
      )
    : candidateList;

  async function runMatcher(posting: PostingWithEmployer) {
    setSelected(posting);
    setData(null);
    setLoading(true);
    const res = await fetch(`/api/admin/postings/${posting.id}/candidates`);
    const json = await res.json();
    setData(res.ok ? json : null);
    setLoading(false);
  }

  async function sendPitch() {
    if (!pitchTarget || !selected) return;
    setSending(true);
    setPitchResult(null);
    setPitchError(null);

    const res = await fetch("/api/admin/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employer_id: selected.employer_id,
        candidate_id: pitchTarget.candidate_id,
        posting_id: selected.id,
        pitch_message: pitchMsg,
        offered_salary: pitchSalary ? Math.round(parseFloat(pitchSalary) * 100) : null,
      }),
    });

    if (res.ok) {
      setPitchResult("success");
      setPitchMsg("");
      setPitchSalary("");
      setData((prev) =>
        prev
          ? {
              ...prev,
              pitchedCandidateIds: [...prev.pitchedCandidateIds, pitchTarget.candidate_id],
              capacity: { ...prev.capacity, active: prev.capacity.active + 1 },
            }
          : prev
      );
    } else {
      const json = await res.json().catch(() => ({}));
      setPitchError(json.error ?? "PITCH FAILED");
      setPitchResult("error");
    }
    setSending(false);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="mono" style={{ color: "var(--gold)", fontSize: 14, letterSpacing: "0.16em" }}>
            CONCIERGE
          </h1>
          <p className="mono mt-1" style={{ fontSize: 11.5, color: "var(--muted)" }}>
            INTERNAL · MANUAL MATCHING TOOL
          </p>
        </div>
        <div className="text-right">
          <p className="kicker">SALARY DATA · MATCH-SOURCED</p>
          <p className="mono tnum mt-1" style={{ fontSize: 18, color: "var(--up)" }}>
            {matchSalaryPointCount}
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">JOB POSTINGS</span>
          <span className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>
            {postings.length} TOTAL
          </span>
        </div>

        {postings.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="kicker">NO JOB POSTINGS</p>
          </div>
        ) : (
          <div>
            {postings.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-4"
                style={{
                  borderBottom: idx === postings.length - 1 ? "none" : "1px solid var(--border-soft)",
                  background: selected?.id === p.id ? "var(--surface-2)" : "transparent",
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="mono truncate" style={{ fontSize: 13, color: "var(--text)" }}>
                    {p.title}
                    <span style={{ color: "var(--muted)" }}> · {p.employers?.company_name ?? "—"}</span>
                  </p>
                  <p className="mono tnum mt-0.5" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {p.vertical.toUpperCase()} · MAX {p.max_candidates} · {formatShortDate(p.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={p.status === "open" ? "up" : "muted"}>{p.status.toUpperCase()}</Badge>
                  <Button size="sm" loading={loading && selected?.id === p.id} onClick={() => runMatcher(p)}>
                    RUN MATCHER →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">CANDIDATES · FOUNDER VERIFICATION</span>
          <input
            value={candidateSearch}
            onChange={(e) => setCandidateSearch(e.target.value)}
            placeholder="SEARCH NAME..."
            className="field"
            style={{ width: 180, fontSize: 11 }}
          />
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="kicker">NO CANDIDATES</p>
          </div>
        ) : (
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {filteredCandidates.map((c, idx) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 p-4"
                style={{ borderBottom: idx === filteredCandidates.length - 1 ? "none" : "1px solid var(--border-soft)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="mono flex items-center gap-1.5 truncate" style={{ fontSize: 13, color: "var(--text)" }}>
                    <span className="truncate">
                      {c.profiles?.display_name ?? `CAND-${c.id.slice(0, 6).toUpperCase()}`}
                    </span>
                    {c.is_founder_verified && <Badge variant="gold">VERIFIED</Badge>}
                  </p>
                  <p className="mono tnum mt-0.5" style={{ fontSize: 11, color: "var(--muted)" }}>
                    SCORE {c.composite_score.toFixed(1)} · {formatPercentile(c.percentile_rank)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={c.is_founder_verified ? "ghost" : "primary"}
                  loading={verifyingId === c.id}
                  onClick={() => toggleVerified(c)}
                >
                  {c.is_founder_verified ? "UNVERIFY" : "VERIFY"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">MATCHED CANDIDATES · {selected.title.toUpperCase()}</span>
            {data && (
              <span
                className="mono tnum"
                style={{ fontSize: 11, color: data.capacity.active >= data.capacity.max ? "var(--down)" : "var(--muted)" }}
              >
                CAPACITY: {data.capacity.active} / {data.capacity.max}
              </span>
            )}
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center">
              <p className="kicker">RUNNING CANDIDATE-MATCHER…</p>
            </div>
          ) : !data ? (
            <div className="px-4 py-12 text-center">
              <p className="kicker" style={{ color: "var(--down)" }}>
                FAILED TO LOAD MATCHED CANDIDATES
              </p>
            </div>
          ) : data.matches.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="kicker">NO MATCHING CANDIDATE POSTINGS</p>
            </div>
          ) : (
            <div>
              {data.matches.map((m, idx) => {
                const pitched = data.pitchedCandidateIds.includes(m.candidate_id);
                const atCapacity = data.capacity.active >= data.capacity.max;
                return (
                  <div
                    key={m.candidate_posting_id}
                    className="flex items-start gap-3 p-4"
                    style={{ borderBottom: idx === data.matches.length - 1 ? "none" : "1px solid var(--border-soft)" }}
                  >
                    <span className="mono tnum mt-0.5" style={{ fontSize: 12, color: "var(--muted)" }}>
                      {idx + 1}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="mono truncate" style={{ fontSize: 13, color: "var(--text)" }}>
                          {m.display_name ?? `CAND-${m.candidate_id.slice(0, 6).toUpperCase()}`}
                          <span style={{ color: "var(--muted)" }}> · {m.posting_title}</span>
                        </p>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <Badge variant="gold">{m.match_score}% MATCH</Badge>
                          {m.match_percentile != null && <Badge variant="up">P{m.match_percentile}</Badge>}
                        </span>
                      </div>

                      <ScoreBar score={m.composite_score} />

                      <p className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>
                        SCORE {m.composite_score.toFixed(1)} · {formatPercentile(m.percentile_rank)}
                        {m.years_exp_claimed != null && ` · ${m.years_exp_claimed} YRS`}
                        {m.location && ` · ${m.location}`}
                      </p>

                      {m.desired_salary_min != null && m.desired_salary_max != null && (
                        <p className="mono tnum" style={{ fontSize: 11, color: "var(--up)" }}>
                          {formatSalaryBand(m.desired_salary_min, m.desired_salary_max)}
                        </p>
                      )}

                      {m.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.skills.slice(0, 5).map((skill) => (
                            <Badge key={skill} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                          {m.skills.length > 5 && <Badge variant="outline">+{m.skills.length - 5} MORE</Badge>}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {pitched ? (
                        <Badge variant="up">PITCHED</Badge>
                      ) : (
                        <Button
                          size="sm"
                          disabled={atCapacity}
                          onClick={() => {
                            setPitchTarget(m);
                            setPitchResult(null);
                            setPitchError(null);
                          }}
                        >
                          PITCH
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal open={!!pitchTarget} onClose={() => setPitchTarget(null)} title="CREATE PITCH (CONCIERGE)">
        <div className="space-y-4">
          <p className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            ON BEHALF OF{" "}
            <span style={{ color: "var(--text)" }}>{selected?.employers?.company_name ?? "EMPLOYER"}</span>
            {" → "}
            <span style={{ color: "var(--text)" }}>{pitchTarget?.display_name ?? "CANDIDATE"}</span>
          </p>

          <div>
            <label className="kicker mb-1.5 block">PITCH MESSAGE</label>
            <textarea
              value={pitchMsg}
              onChange={(e) => setPitchMsg(e.target.value)}
              rows={4}
              placeholder="Tell this candidate why they should join..."
              className="field"
            />
          </div>

          <div>
            <label className="kicker mb-1.5 block">OFFERED SALARY (HKD/MONTH)</label>
            <input
              type="number"
              value={pitchSalary}
              onChange={(e) => setPitchSalary(e.target.value)}
              placeholder="120000"
              className="field"
            />
          </div>

          {pitchResult === "success" && (
            <div
              className="rounded p-3"
              style={{ border: "1px solid color-mix(in oklch, var(--up) 40%, transparent)", background: "var(--up-dim)" }}
            >
              <p className="mono" style={{ fontSize: 11, color: "var(--up)" }}>
                PITCH CREATED · CANDIDATE NOTIFIED
              </p>
            </div>
          )}
          {pitchResult === "error" && (
            <div
              className="rounded p-3"
              style={{ border: "1px solid color-mix(in oklch, var(--down) 40%, transparent)", background: "var(--down-dim)" }}
            >
              <p className="mono" style={{ fontSize: 11, color: "var(--down)" }}>
                {pitchError ?? "PITCH FAILED"}
              </p>
            </div>
          )}

          {pitchResult !== "success" && (
            <div className="flex gap-3">
              <Button onClick={sendPitch} loading={sending} disabled={!pitchMsg.trim()}>
                CREATE PITCH
              </Button>
              <Button variant="ghost" onClick={() => setPitchTarget(null)}>
                CANCEL
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </main>
  );
}

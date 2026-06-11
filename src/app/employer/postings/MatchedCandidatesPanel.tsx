"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ScoreBar } from "@/components/charts/ScoreBar";
import { formatSalaryBand, formatPercentile } from "@/lib/utils/formatters";

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
}

interface CandidatesResponse {
  matches: MatchedCandidate[];
  pitchedCandidateIds: string[];
  capacity: { max: number; active: number };
}

interface Props {
  postingId: string;
}

export function MatchedCandidatesPanel({ postingId }: Props) {
  const [data, setData] = useState<CandidatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pitchTarget, setPitchTarget] = useState<MatchedCandidate | null>(null);
  const [pitchMsg, setPitchMsg] = useState("");
  const [pitchSalary, setPitchSalary] = useState("");
  const [sending, setSending] = useState(false);
  const [pitchResult, setPitchResult] = useState<"success" | "error" | null>(null);
  const [pitchError, setPitchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/employer-postings/${postingId}/candidates`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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

  if (loading) {
    return (
      <div className="panel p-6 text-center">
        <p className="kicker">LOADING MATCHED CANDIDATES…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="panel p-6 text-center">
        <p className="kicker" style={{ color: "var(--down)" }}>
          FAILED TO LOAD MATCHED CANDIDATES
        </p>
      </div>
    );
  }

  const { matches, pitchedCandidateIds, capacity } = data;
  const pitchedSet = new Set(pitchedCandidateIds);
  const atCapacity = capacity.active >= capacity.max;

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">MATCHED CANDIDATES</span>
          <span
            className="mono tnum"
            style={{ fontSize: 11, color: atCapacity ? "var(--down)" : "var(--muted)" }}
          >
            CAPACITY: {capacity.active} / {capacity.max}
          </span>
        </div>

        {matches.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="kicker">NO MATCHING CANDIDATE POSTINGS YET</p>
          </div>
        ) : (
          <div>
            {matches.map((m, idx) => {
              const pitched = pitchedSet.has(m.candidate_id);
              return (
                <div
                  key={m.candidate_posting_id}
                  className="flex items-start gap-3 p-4"
                  style={{
                    borderBottom: idx === matches.length - 1 ? "none" : "1px solid var(--border-soft)",
                  }}
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
                      <Badge variant="gold">{m.match_score}% MATCH</Badge>
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

      <Modal open={!!pitchTarget} onClose={() => setPitchTarget(null)} title="SEND PITCH">
        <div className="space-y-4">
          <p className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            PITCHING TO:{" "}
            <span style={{ color: "var(--text)" }}>{pitchTarget?.display_name ?? "CANDIDATE"}</span>
          </p>

          <div>
            <label className="kicker mb-1.5 block">PITCH MESSAGE</label>
            <textarea
              value={pitchMsg}
              onChange={(e) => setPitchMsg(e.target.value)}
              rows={4}
              placeholder="Tell this candidate why they should join your team..."
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
                PITCH SENT · CANDIDATE NOTIFIED
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
                SEND PITCH
              </Button>
              <Button variant="ghost" onClick={() => setPitchTarget(null)}>
                CANCEL
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

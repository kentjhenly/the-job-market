"use client";

import { useEffect, useState } from "react";
import { OrderBook } from "@/components/terminal/OrderBook";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/terminal/DataRow";
import { Badge } from "@/components/ui/Badge";
import { SkillBadges } from "@/components/ui/SkillBadges";
import { CrossIcon } from "@/components/ui/Glyph";
import { formatPercentile, formatSalaryBand } from "@/lib/utils/formatters";
import { scoreBadgeVariant, repBadgeVariant } from "@/lib/utils/score";
import type { Database } from "@/lib/supabase/types";

export type Candidate = Database["public"]["Tables"]["candidates"]["Row"] & {
  profiles?: { display_name: string } | null;
  candidate_job_postings?: { title: string; location?: string | null; work_eligible?: boolean | null }[] | null;
  candidate_portfolio_projects?: {
    id: string;
    title: string;
    description: string | null;
    link_url: string | null;
    file_name: string | null;
    skills: string[];
  }[] | null;
};

interface Props {
  initialCandidates: Candidate[];
}

const POLL_INTERVAL_MS = 5000;

function openPortfolioProject(p: { id: string; link_url: string | null; file_name: string | null }) {
  if (p.file_name) {
    window.open(`/api/portfolio/${p.id}/file`, "_blank", "noopener,noreferrer");
  } else if (p.link_url) {
    const url = /^https?:\/\//i.test(p.link_url) ? p.link_url : `https://${p.link_url}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function linkHostname(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function FeedClient({ initialCandidates }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [pitchOpen, setPitchOpen] = useState(false);
  const [pitchMsg, setPitchMsg] = useState("");
  const [pitchSalary, setPitchSalary] = useState("");
  const [sending, setSending] = useState(false);
  const [pitchResult, setPitchResult] = useState<"success" | "error" | null>(null);

  // Poll for score updates to reorder the feed (Supabase Realtime is inert for Better Auth sessions, see CLAUDE.md)
  useEffect(() => {
    const interval = setInterval(() => {
      // Don't poll/re-sort the feed while the tab is backgrounded.
      if (document.hidden) return;
      fetch("/api/candidates/feed")
        .then((r) => r.json())
        .then((d) => {
          if (!d.candidates) return;
          setCandidates(d.candidates as Candidate[]);
          setSelected((prev) =>
            prev ? (d.candidates as Candidate[]).find((c) => c.id === prev.id) ?? prev : prev
          );
        })
        .catch(() => null);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  async function sendPitch() {
    if (!selected) return;
    setSending(true);
    setPitchResult(null);

    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_id: selected.id,
        pitch_message: pitchMsg,
        offered_salary: pitchSalary ? Math.round(parseFloat(pitchSalary) * 100) : null,
      }),
    });

    if (res.ok) {
      setPitchResult("success");
      setPitchMsg("");
      setPitchSalary("");
    } else {
      setPitchResult("error");
    }
    setSending(false);
  }

  return (
    <div className="view-enter space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mono" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
            CANDIDATE FEED
          </h1>
          <p className="mono mt-1 flex items-center gap-2" style={{ fontSize: 10.5, color: "var(--dim)", letterSpacing: "0.08em" }}>
            RANKED BY COMPOSITE SCORE <span className="live-dot" />
            <span style={{ color: "var(--up)" }}>LIVE</span>
          </p>
        </div>
      </div>

      <OrderBook candidates={candidates} onSelect={setSelected} selectedId={selected?.id} />

      {/* Candidate detail slide-in */}
      {selected && (
        <div
          className="slideover-panel flex flex-col"
          style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
        >
          <div className="panel-head">
            <span className="panel-title">CANDIDATE DETAIL</span>
            <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm" aria-label="Close">
              <CrossIcon size={11} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-auto p-4">
            <div>
              <p className="mono" style={{ fontSize: 13, color: "var(--text)" }}>
                {selected.profiles?.display_name ?? `CAND-${selected.id.slice(0, 8).toUpperCase()}`}
              </p>
              <Badge variant={scoreBadgeVariant(selected.composite_score)} className="mt-1">
                SCORE {selected.composite_score.toFixed(1)}
              </Badge>
            </div>

            <div>
              <DataRow label="COMPOSITE SCORE" value={selected.composite_score.toFixed(1)} color={scoreBadgeVariant(selected.composite_score)} />
              <DataRow label="PERCENTILE" value={formatPercentile(selected.percentile_rank)} color={scoreBadgeVariant(selected.percentile_rank)} />
              <DataRow
                label="EXPERIENCE"
                value={
                  selected.years_exp_claimed != null
                    ? `${selected.years_exp_claimed} YRS`
                    : "NOT DISCLOSED"
                }
              />
              <DataRow
                label="SALARY RANGE"
                value={
                  selected.desired_salary_min && selected.desired_salary_max
                    ? formatSalaryBand(selected.desired_salary_min, selected.desired_salary_max)
                    : "NOT DISCLOSED"
                }
              />
              <DataRow label="LOCATION" value={selected.location?.toUpperCase() ?? "NOT DISCLOSED"} />
              <DataRow
                label="REMOTE ONLY"
                value={selected.remote_only ? "YES" : "NO"}
                color={selected.remote_only ? "up" : undefined}
              />
              <DataRow label="REPUTATION" value={`${selected.reputation_score?.toFixed(0) ?? 100}/100`} color={repBadgeVariant(selected.reputation_score ?? 100)} />
              {(() => {
                const postings = selected.candidate_job_postings ?? [];
                const needsVisa = postings.some((p) => p.work_eligible === false);
                const hasRight = postings.some((p) => p.work_eligible === true);
                return (
                  <DataRow
                    label="VISA REQUIRED"
                    value={needsVisa ? "YES" : hasRight ? "NO" : "N/A"}
                    color={needsVisa ? "down" : hasRight ? "up" : undefined}
                  />
                );
              })()}
            </div>

            {(selected.candidate_portfolio_projects?.length ?? 0) > 0 && (
              <div>
                <p className="kicker mb-2">PORTFOLIO ({selected.candidate_portfolio_projects!.length})</p>
                <div className="space-y-2">
                  {selected.candidate_portfolio_projects!.map((p) => {
                    const openable = !!(p.file_name || p.link_url);
                    return (
                    <div
                      key={p.id}
                      className="rounded-md p-3"
                      role={openable ? "button" : undefined}
                      tabIndex={openable ? 0 : undefined}
                      onClick={openable ? () => openPortfolioProject(p) : undefined}
                      onKeyDown={openable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPortfolioProject(p); } } : undefined}
                      style={{ border: "1px solid var(--border-soft)", background: "var(--surface-2)", cursor: openable ? "pointer" : undefined }}
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
                        <p className="mono mt-1 truncate" style={{ fontSize: 10.5, color: "var(--up)" }}>
                          {p.file_name ?? linkHostname(p.link_url!)} →
                        </p>
                      )}
                      {p.skills.length > 0 && (
                        <div className="mt-2">
                          <SkillBadges skills={p.skills} />
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
            <Button
              onClick={() => {
                setPitchOpen(true);
                setPitchResult(null);
              }}
              className="w-full"
            >
              SEND PITCH →
            </Button>
          </div>
        </div>
      )}

      <Modal open={pitchOpen} onClose={() => setPitchOpen(false)} title="SEND PITCH">
        <div className="space-y-4">
          <p className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            PITCHING TO:{" "}
            <span style={{ color: "var(--text)" }}>
              {selected?.profiles?.display_name ?? "CANDIDATE"}
            </span>
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
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="120000"
              className="field"
            />
            <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
              SENDING A PITCH IS FREE · THE CANDIDATE WILL BE NOTIFIED
            </p>
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
                PITCH FAILED · YOU MAY HAVE ALREADY PITCHED THIS CANDIDATE
              </p>
            </div>
          )}

          {pitchResult !== "success" && (
            <div className="flex gap-3">
              <Button onClick={sendPitch} loading={sending} disabled={!pitchMsg.trim()}>
                SEND PITCH
              </Button>
              <Button variant="ghost" onClick={() => setPitchOpen(false)}>
                CANCEL
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

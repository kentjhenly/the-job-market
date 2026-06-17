"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/terminal/DataRow";
import { formatSalary, formatRelativeTime, formatPercentile, formatScore } from "@/lib/utils/formatters";
import { MatchChat } from "@/components/terminal/MatchChat";
import type { Database } from "@/lib/supabase/types";

type MatchWithCandidate = Database["public"]["Tables"]["matches"]["Row"] & {
  candidates: {
    composite_score: number;
    percentile_rank: number;
    profiles: { display_name: string } | null;
  } | null;
};

const statusVariant: Record<string, "up" | "down" | "gold" | "muted"> = {
  accepted: "up",
  declined: "down",
  ghosted: "down",
  expired: "muted",
  pending: "gold",
};

const COLUMNS = "1rem 7rem 1.6fr 7rem 8rem 8rem 5.5rem 1rem";
const HEADERS = ["", "STATUS", "CANDIDATE", "SCORE", "OFFERED", "SENT", "", ""];

function candidateLabel(m: MatchWithCandidate) {
  return m.candidates?.profiles?.display_name ?? `CAND-${m.candidate_id?.slice(0, 6).toUpperCase()}`;
}

function isUnread(m: MatchWithCandidate) {
  return new Date(m.last_message_at ?? m.created_at) > new Date(m.employer_last_read_at);
}

export function EmployerMatchesClient({ matches: initial }: { matches: MatchWithCandidate[] }) {
  const [matches, setMatches] = useState<MatchWithCandidate[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatMatchId, setChatMatchId] = useState<string | null>(null);

  const selected = matches.find((m) => m.id === selectedId) ?? null;
  const chatMatch = matches.find((m) => m.id === chatMatchId) ?? null;

  function markRead(m: MatchWithCandidate) {
    const now = new Date().toISOString();
    setMatches((prev) => prev.map((mm) => (mm.id === m.id ? { ...mm, employer_last_read_at: now } : mm)));
    fetch(`/api/matches/${m.id}/read`, { method: "POST" });
  }

  function openRow(m: MatchWithCandidate) {
    setSelectedId(m.id);
    setChatMatchId(null);
    markRead(m);
  }

  function openChat(m: MatchWithCandidate) {
    setChatMatchId(m.id);
    setSelectedId(null);
    markRead(m);
  }

  return (
    <div className="view-enter space-y-6">
      <div>
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          PITCHES
        </h1>
      </div>

      <div className="panel overflow-hidden">
        <div
          className="grid gap-3 px-4 py-2.5"
          style={{ gridTemplateColumns: COLUMNS, borderBottom: "1px solid var(--border-soft)" }}
        >
          {HEADERS.map((h, i) => (
            <span key={i} className="kicker">
              {h}
            </span>
          ))}
        </div>

        {matches.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="kicker">NO PITCHES SENT YET. BROWSE THE CANDIDATE FEED TO GET STARTED.</p>
          </div>
        ) : (
          matches.map((m, idx) => {
            const score = m.candidates?.composite_score;
            const sel = m.id === selectedId;
            const unread = isUnread(m);
            return (
              <div
                key={m.id}
                onClick={() => openRow(m)}
                className="grid cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                style={{
                  gridTemplateColumns: COLUMNS,
                  borderBottom: idx === matches.length - 1 ? "none" : "1px solid var(--border-soft)",
                  borderLeft: `2px solid ${sel ? "var(--up)" : "transparent"}`,
                  background: sel ? "var(--up-dim)" : "transparent",
                }}
              >
                <div className="flex items-center justify-center">
                  {unread && <span className="live-dot" title="Unread activity" />}
                </div>
                <div>
                  <Badge variant={statusVariant[m.status] ?? "muted"}>{m.status.toUpperCase()}</Badge>
                </div>
                <p className="mono truncate" style={{ fontSize: 13, color: "var(--text)" }}>
                  {candidateLabel(m)}
                </p>
                <span className="mono tnum" style={{ fontSize: 12, color: score != null ? "var(--up)" : "var(--muted)" }}>
                  {score != null ? score.toFixed(1) : "—"}
                </span>
                <span
                  className="mono tnum"
                  style={{ fontSize: 12, fontWeight: 600, color: m.offered_salary ? "var(--up)" : "var(--muted)" }}
                >
                  {m.offered_salary ? formatSalary(m.offered_salary) : "—"}
                </span>
                <span className="mono" style={{ fontSize: 11, color: m.status === "pending" ? "var(--gold)" : "var(--muted)" }}>
                  {m.status === "pending" ? `EXP ${formatRelativeTime(m.expires_at)}` : formatRelativeTime(m.created_at)}
                </span>
                <div>
                  {m.status === "accepted" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openChat(m);
                      }}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 10.5, whiteSpace: "nowrap" }}
                    >
                      CHAT →
                    </button>
                  )}
                </div>
                <span className="mono" style={{ fontSize: 14, color: "var(--dim)" }}>
                  ›
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* pitch detail slide-over */}
      {selected && (
        <div
          className="slideover-panel flex flex-col"
          style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
        >
          <div className="panel-head">
            <span className="panel-title">PITCH DETAIL</span>
            <button onClick={() => setSelectedId(null)} className="btn btn-ghost btn-sm">
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-auto p-4">
            <div className="flex items-center justify-between">
              <span className="mono" style={{ fontSize: 16, color: "var(--text)", fontWeight: 600 }}>
                {candidateLabel(selected)}
              </span>
              <Badge variant={statusVariant[selected.status] ?? "muted"}>{selected.status.toUpperCase()}</Badge>
            </div>

            <div>
              {selected.candidates?.composite_score != null && (
                <DataRow label="SCORE" value={selected.candidates.composite_score.toFixed(1)} color="up" />
              )}
              {selected.candidates?.percentile_rank != null && (
                <DataRow label="PERCENTILE" value={formatPercentile(selected.candidates.percentile_rank)} color="gold" />
              )}
              {selected.offered_salary != null && (
                <DataRow label="OFFERED SALARY" value={formatSalary(selected.offered_salary)} color="up" />
              )}
              <DataRow label="SENT" value={formatRelativeTime(selected.created_at)} />
              {selected.status === "pending" && (
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
            counterpartLabel={candidateLabel(chatMatch)}
            counterpartSubLabel={
              chatMatch.candidates?.composite_score != null
                ? `SCORE ${formatScore(chatMatch.candidates.composite_score)} · ${formatPercentile(chatMatch.candidates.percentile_rank).toUpperCase()}`
                : undefined
            }
            offeredSalary={chatMatch.offered_salary}
          />
        </div>
      )}
    </div>
  );
}

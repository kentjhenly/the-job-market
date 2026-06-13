"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/terminal/DataRow";
import { formatSalary, formatRelativeTime } from "@/lib/utils/formatters";
import { MatchChat } from "@/components/terminal/MatchChat";

interface Match {
  id: string;
  status: string;
  pitch_message: string | null;
  offered_salary: number | null;
  expires_at: string;
  created_at: string;
  last_message_at: string | null;
  candidate_last_read_at: string | null;
  employers?: { company_name: string; reputation_score: number } | null;
}

const statusVariant: Record<string, "up" | "down" | "gold" | "muted"> = {
  accepted: "up",
  declined: "down",
  ghosted: "down",
  expired: "muted",
  pending: "gold",
};

const COLUMNS = "1rem 7rem 1.6fr 8rem 7rem 8rem 5.5rem 1rem";
const HEADERS = ["", "STATUS", "EMPLOYER", "OFFERED", "REPUTATION", "SENT", "", ""];

function reputationColor(reputation?: number | null) {
  return reputation == null ? "var(--muted)" : reputation >= 80 ? "var(--up)" : reputation >= 50 ? "var(--gold)" : "var(--down)";
}

function isUnread(m: Match) {
  return (
    !m.candidate_last_read_at ||
    new Date(m.last_message_at ?? m.created_at) > new Date(m.candidate_last_read_at)
  );
}

interface MatchesClientProps {
  matches: Match[];
  freeAcceptsRemaining: number;
  credits: number;
}

export function MatchesClient({ matches: initial, freeAcceptsRemaining, credits }: MatchesClientProps) {
  const [matches, setMatches] = useState<Match[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatMatchId, setChatMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selected = matches.find((m) => m.id === selectedId) ?? null;
  const chatMatch = matches.find((m) => m.id === chatMatchId) ?? null;
  const acceptBlocked = freeAcceptsRemaining <= 0 && credits < 1;

  async function respond(matchId: string, action: "accept" | "decline") {
    setLoading((prev) => ({ ...prev, [matchId]: true }));
    setErrors((prev) => ({ ...prev, [matchId]: "" }));
    const res = await fetch(`/api/matches/${matchId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const { status } = await res.json();
      setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, status } : m)));
    } else {
      const json = await res.json().catch(() => ({}));
      setErrors((prev) => ({
        ...prev,
        [matchId]: json.error ?? "FAILED TO RESPOND",
      }));
    }
    setLoading((prev) => ({ ...prev, [matchId]: false }));
  }

  function markRead(m: Match) {
    const now = new Date().toISOString();
    setMatches((prev) => prev.map((mm) => (mm.id === m.id ? { ...mm, candidate_last_read_at: now } : mm)));
    fetch(`/api/matches/${m.id}/read`, { method: "POST" });
  }

  function openRow(m: Match) {
    setSelectedId(m.id);
    setChatMatchId(null);
    markRead(m);
  }

  function openChat(m: Match) {
    setChatMatchId(m.id);
    setSelectedId(null);
    markRead(m);
  }

  return (
    <div className="view-enter space-y-6">
      <div>
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          INCOMING PITCHES
        </h1>
        <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
          PITCHES ARE FREE TO RECEIVE. ACCEPTING ONE TO START A CHAT{" "}
          {freeAcceptsRemaining > 0
            ? `USES 1 OF YOUR ${freeAcceptsRemaining} REMAINING FREE ACCEPTS.`
            : "COSTS 1 MATCH CREDIT."}{" "}
          RANKED BY OFFERED SALARY.
        </p>
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
            <p className="kicker">NO PITCHES YET. IMPROVE YOUR SKILL SCORE TO ATTRACT EMPLOYERS.</p>
          </div>
        ) : (
          matches.map((m, idx) => {
            const reputation = m.employers?.reputation_score;
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
                  {m.employers?.company_name ?? "UNKNOWN COMPANY"}
                </p>
                <span
                  className="mono tnum"
                  style={{ fontSize: 12, fontWeight: 600, color: m.offered_salary ? "var(--up)" : "var(--muted)" }}
                >
                  {m.offered_salary ? formatSalary(m.offered_salary) : "—"}
                </span>
                <span className="mono tnum" style={{ fontSize: 11, color: reputationColor(reputation) }}>
                  {reputation != null ? `${reputation.toFixed(0)}/100` : "—"}
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
                {selected.employers?.company_name ?? "UNKNOWN COMPANY"}
              </span>
              <Badge variant={statusVariant[selected.status] ?? "muted"}>{selected.status.toUpperCase()}</Badge>
            </div>

            <div>
              {selected.offered_salary != null && (
                <DataRow label="OFFERED SALARY" value={formatSalary(selected.offered_salary)} color="up" />
              )}
              {selected.employers?.reputation_score != null && (
                <DataRow
                  label="EMPLOYER REPUTATION"
                  value={`${selected.employers.reputation_score.toFixed(0)}/100`}
                  color={selected.employers.reputation_score >= 80 ? "up" : selected.employers.reputation_score >= 50 ? "gold" : "down"}
                />
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

          {selected.status === "pending" && (
            <div className="space-y-2 p-4" style={{ borderTop: "1px solid var(--border)" }}>
              {errors[selected.id] && (
                <p className="kicker c-down" style={{ fontSize: 11 }}>
                  {errors[selected.id]}
                </p>
              )}
              <p className="kicker c-muted" style={{ fontSize: 10 }}>
                {acceptBlocked
                  ? "NO FREE ACCEPTS OR MATCH CREDITS REMAINING — PURCHASE CREDITS TO ACCEPT"
                  : freeAcceptsRemaining > 0
                    ? `ACCEPTING USES 1 OF ${freeAcceptsRemaining} REMAINING FREE ACCEPTS`
                    : "ACCEPTING USES 1 MATCH CREDIT"}
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => respond(selected.id, "accept")}
                  loading={loading[selected.id]}
                  disabled={acceptBlocked}
                  className="flex-1"
                >
                  ACCEPT MATCH
                </Button>
                <Button variant="danger" onClick={() => respond(selected.id, "decline")} loading={loading[selected.id]} className="flex-1">
                  DECLINE
                </Button>
              </div>
            </div>
          )}
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
            counterpartLabel={chatMatch.employers?.company_name ?? "UNKNOWN COMPANY"}
            counterpartSubLabel={
              chatMatch.employers?.reputation_score != null
                ? `REPUTATION ${chatMatch.employers.reputation_score.toFixed(0)}/100`
                : undefined
            }
            offeredSalary={chatMatch.offered_salary}
          />
        </div>
      )}
    </div>
  );
}

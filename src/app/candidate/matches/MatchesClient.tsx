"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatSalary, formatRelativeTime } from "@/lib/utils/formatters";

interface Match {
  id: string;
  status: string;
  pitch_message: string | null;
  offered_salary: number | null;
  expires_at: string;
  created_at: string;
  employers?: { company_name: string; reputation_score: number } | null;
}

const statusVariant: Record<string, "up" | "down" | "gold" | "muted"> = {
  accepted: "up",
  declined: "down",
  ghosted: "down",
  expired: "muted",
  pending: "gold",
};

export function MatchesClient({ matches: initial }: { matches: Match[] }) {
  const [matches, setMatches] = useState<Match[]>(initial);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function respond(matchId: string, action: "accept" | "decline") {
    setLoading((prev) => ({ ...prev, [matchId]: true }));
    const res = await fetch(`/api/matches/${matchId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const { status } = await res.json();
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, status } : m))
      );
    }
    setLoading((prev) => ({ ...prev, [matchId]: false }));
  }

  const pending = matches.filter((m) => m.status === "pending");
  const past = matches.filter((m) => m.status !== "pending");

  return (
    <div className="view-enter max-w-3xl space-y-6">
      <div>
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          INCOMING PITCHES
        </h1>
        <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
          EMPLOYERS PAY TO CONTACT YOU. EVERY PITCH IS SERIOUS.
        </p>
      </div>

      {pending.length === 0 && past.length === 0 && (
        <div className="panel p-12 text-center">
          <p className="kicker">
            NO PITCHES YET. IMPROVE YOUR SKILL SCORE TO ATTRACT EMPLOYERS.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <p className="kicker mb-3" style={{ color: "var(--gold)" }}>
            PENDING ({pending.length})
          </p>
          <div className="space-y-3">
            {pending.map((m) => (
              <MatchCard key={m.id} match={m} onRespond={respond} loading={loading[m.id]} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <p className="kicker mb-3">HISTORY</p>
          <div className="space-y-3">
            {past.map((m) => (
              <MatchCard key={m.id} match={m} onRespond={respond} loading={loading[m.id]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match,
  onRespond,
  loading,
}: {
  match: Match;
  onRespond: (id: string, action: "accept" | "decline") => void;
  loading?: boolean;
}) {
  const isPending = match.status === "pending";
  const variant = statusVariant[match.status] ?? "muted";
  const reputation = match.employers?.reputation_score;
  const reputationColor =
    reputation == null ? "var(--muted)" : reputation >= 80 ? "var(--up)" : reputation >= 50 ? "var(--gold)" : "var(--down)";

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <span className="panel-title">{match.employers?.company_name ?? "UNKNOWN COMPANY"}</span>
          <p className="mono mt-0.5" style={{ fontSize: 11, color: "var(--muted)" }}>
            {formatRelativeTime(match.created_at)}
            {isPending && <> · EXPIRES {formatRelativeTime(match.expires_at)}</>}
          </p>
        </div>
        <Badge variant={variant}>{match.status.toUpperCase()}</Badge>
      </div>

      <div className="space-y-3 px-4 py-3">
        {match.offered_salary && (
          <p className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--up)" }}>
            OFFERED: {formatSalary(match.offered_salary)}
          </p>
        )}
        {match.pitch_message && (
          <p className="mono" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
            {match.pitch_message}
          </p>
        )}

        {reputation != null && (
          <p className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            EMPLOYER REPUTATION: <span style={{ color: reputationColor }}>{reputation.toFixed(0)}/100</span>
          </p>
        )}

        {isPending && (
          <div className="flex gap-3 pt-1">
            <Button onClick={() => onRespond(match.id, "accept")} loading={loading} size="sm">
              ACCEPT MATCH
            </Button>
            <Button variant="danger" onClick={() => onRespond(match.id, "decline")} loading={loading} size="sm">
              DECLINE
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

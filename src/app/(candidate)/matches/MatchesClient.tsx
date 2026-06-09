"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
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

const statusVariant: Record<string, "green" | "danger" | "gold" | "muted"> = {
  accepted: "green",
  declined: "danger",
  ghosted: "danger",
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
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-mono text-green text-sm tracking-widest">INCOMING PITCHES</h1>
        <p className="text-muted text-xs font-mono mt-1">
          EMPLOYERS PAY TO CONTACT YOU. EVERY PITCH IS SERIOUS.
        </p>
      </div>

      {pending.length === 0 && past.length === 0 && (
        <div className="border border-border bg-surface p-12 text-center">
          <p className="font-mono text-muted text-xs">
            NO PITCHES YET. IMPROVE YOUR SKILL SCORE TO ATTRACT EMPLOYERS.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <p className="font-mono text-xs text-gold tracking-widest mb-3">
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
          <p className="font-mono text-xs text-muted tracking-widest mb-3">HISTORY</p>
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

  return (
    <Card noPadding>
      <CardHeader>
        <div>
          <CardTitle>{match.employers?.company_name ?? "UNKNOWN COMPANY"}</CardTitle>
          <p className="text-muted text-xs font-mono mt-0.5">
            {formatRelativeTime(match.created_at)}
            {isPending && (
              <>
                {" "}· EXPIRES {formatRelativeTime(match.expires_at)}
              </>
            )}
          </p>
        </div>
        <Badge variant={variant}>{match.status.toUpperCase()}</Badge>
      </CardHeader>

      <div className="px-4 py-3 space-y-3">
        {match.offered_salary && (
          <p className="font-mono text-sm text-green">
            OFFERED: {formatSalary(match.offered_salary)}
          </p>
        )}
        {match.pitch_message && (
          <p className="text-muted text-xs font-mono leading-relaxed">{match.pitch_message}</p>
        )}

        {match.employers?.reputation_score != null && (
          <p className="font-mono text-xs text-muted">
            EMPLOYER REPUTATION:{" "}
            <span
              className={
                match.employers.reputation_score >= 80
                  ? "text-green"
                  : match.employers.reputation_score >= 50
                    ? "text-gold"
                    : "text-danger"
              }
            >
              {match.employers.reputation_score.toFixed(0)}/100
            </span>
          </p>
        )}

        {isPending && (
          <div className="flex gap-3 pt-1">
            <Button
              onClick={() => onRespond(match.id, "accept")}
              loading={loading}
              size="sm"
            >
              ACCEPT MATCH
            </Button>
            <Button
              variant="danger"
              onClick={() => onRespond(match.id, "decline")}
              loading={loading}
              size="sm"
            >
              DECLINE
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

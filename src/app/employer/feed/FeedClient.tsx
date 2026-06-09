"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { OrderBook } from "@/components/terminal/OrderBook";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/terminal/DataRow";
import { Badge } from "@/components/ui/Badge";
import { formatSalary, formatPercentile, formatSalaryBand } from "@/lib/utils/formatters";
import { SCORE_TIERS } from "@/lib/utils/constants";
import type { Database } from "@/lib/supabase/types";

type Candidate = Database["public"]["Tables"]["candidates"]["Row"] & {
  profiles?: { display_name: string } | null;
};

interface Props {
  employerId: string;
  initialCandidates: Candidate[];
  employerCredits: number;
}

export function FeedClient({ employerId, initialCandidates, employerCredits }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [credits, setCredits] = useState(employerCredits);
  const [pitchOpen, setPitchOpen] = useState(false);
  const [pitchMsg, setPitchMsg] = useState("");
  const [pitchSalary, setPitchSalary] = useState("");
  const [sending, setSending] = useState(false);
  const [pitchResult, setPitchResult] = useState<"success" | "error" | null>(null);
  const supabase = getSupabaseBrowserClient();

  // Realtime: subscribe to candidate updates (score changes reorder feed)
  useEffect(() => {
    const channel = supabase
      .channel("candidates-feed")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "candidates" },
        (payload) => {
          setCandidates((prev) => {
            const updated = prev.map((c) =>
              c.id === payload.new.id ? { ...c, ...(payload.new as Candidate) } : c
            );
            return [...updated].sort((a, b) => b.composite_score - a.composite_score);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function sendPitch() {
    if (!selected || credits < 1) return;
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
      setCredits((c) => c - 1);
      setPitchResult("success");
      setPitchMsg("");
      setPitchSalary("");
    } else {
      setPitchResult("error");
    }
    setSending(false);
  }

  const scoreColor =
    (selected?.composite_score ?? 0) >= SCORE_TIERS.gold
      ? "gold"
      : (selected?.composite_score ?? 0) >= SCORE_TIERS.green
        ? "green"
        : "danger";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-green text-sm tracking-widest">CANDIDATE FEED</h1>
          <p className="text-muted text-xs font-mono mt-0.5">
            RANKED BY COMPOSITE SCORE · LIVE UPDATES
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted">
            CREDITS: <span className="text-green">{credits}</span>
          </span>
        </div>
      </div>

      <OrderBook
        candidates={candidates}
        onSelect={setSelected}
        selectedId={selected?.id}
      />

      {/* Candidate detail slide-in */}
      {selected && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-surface border-l border-border z-40 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-mono text-xs tracking-widest text-muted">CANDIDATE DETAIL</span>
            <button
              onClick={() => setSelected(null)}
              className="text-muted hover:text-white font-mono text-sm transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div>
              <p className="font-mono text-white text-sm">
                {selected.profiles?.display_name ?? `CAND-${selected.id.slice(0, 8).toUpperCase()}`}
              </p>
              <Badge variant={scoreColor} className="mt-1">
                SCORE {selected.composite_score.toFixed(1)}
              </Badge>
            </div>

            <div>
              <DataRow
                label="COMPOSITE SCORE"
                value={selected.composite_score.toFixed(1)}
                valueColor="green"
              />
              <DataRow
                label="PERCENTILE"
                value={formatPercentile(selected.percentile_rank)}
                valueColor="gold"
              />
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
              <DataRow label="LOCATION" value={selected.location ?? "NOT DISCLOSED"} />
              <DataRow
                label="REMOTE ONLY"
                value={selected.remote_only ? "YES" : "NO"}
              />
              <DataRow
                label="REPUTATION"
                value={`${selected.reputation_score?.toFixed(0) ?? 100}/100`}
              />
            </div>
          </div>

          <div className="border-t border-border p-4">
            {credits < 1 ? (
              <p className="font-mono text-xs text-danger text-center">
                NO CREDITS REMAINING
              </p>
            ) : (
              <Button
                onClick={() => {
                  setPitchOpen(true);
                  setPitchResult(null);
                }}
                className="w-full"
              >
                SEND PITCH →
              </Button>
            )}
          </div>
        </div>
      )}

      <Modal open={pitchOpen} onClose={() => setPitchOpen(false)} title="SEND PITCH">
        <div className="space-y-4">
          <p className="font-mono text-xs text-muted">
            PITCHING TO:{" "}
            <span className="text-white">
              {selected?.profiles?.display_name ?? "CANDIDATE"}
            </span>
          </p>

          <div>
            <label className="block text-muted text-xs font-mono mb-1 tracking-widest">
              PITCH MESSAGE
            </label>
            <textarea
              value={pitchMsg}
              onChange={(e) => setPitchMsg(e.target.value)}
              rows={4}
              placeholder="Tell this candidate why they should join your team..."
              className="w-full bg-bg border border-border text-white font-mono text-xs px-3 py-2 focus:outline-none focus:border-green resize-none"
            />
          </div>

          <div>
            <label className="block text-muted text-xs font-mono mb-1 tracking-widest">
              OFFERED SALARY (SGD)
            </label>
            <input
              type="number"
              value={pitchSalary}
              onChange={(e) => setPitchSalary(e.target.value)}
              placeholder="120000"
              className="w-full bg-bg border border-border text-white font-mono text-sm px-3 py-2 focus:outline-none focus:border-green"
            />
            <p className="text-muted text-xs font-mono mt-1">
              1 CREDIT WILL BE DEDUCTED · {credits} REMAINING
            </p>
          </div>

          {pitchResult === "success" && (
            <div className="border border-green/30 bg-green/5 p-3">
              <p className="font-mono text-green text-xs">PITCH SENT · CANDIDATE NOTIFIED</p>
            </div>
          )}
          {pitchResult === "error" && (
            <div className="border border-danger/30 bg-danger/10 p-3">
              <p className="font-mono text-danger text-xs">
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

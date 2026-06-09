"use client";

import { cn } from "@/lib/utils/cn";
import { formatSalaryBand, formatPercentile } from "@/lib/utils/formatters";
import { SCORE_TIERS, VERTICAL_LABELS, type VerticalType } from "@/lib/utils/constants";
import type { Database } from "@/lib/supabase/types";

type CandidateRow = Database["public"]["Tables"]["candidates"]["Row"] & {
  profiles?: { display_name: string } | null;
};

interface OrderBookProps {
  candidates: CandidateRow[];
  onSelect?: (candidate: CandidateRow) => void;
  selectedId?: string | null;
  className?: string;
}

function getScoreColor(score: number) {
  if (score >= SCORE_TIERS.gold) return "text-gold";
  if (score >= SCORE_TIERS.green) return "text-green";
  if (score < SCORE_TIERS.red) return "text-danger";
  return "text-muted";
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= SCORE_TIERS.gold
      ? "bg-gold"
      : score >= SCORE_TIERS.green
        ? "bg-green"
        : "bg-danger";

  return (
    <div className="w-24 h-1.5 bg-border">
      <div
        className={cn("h-full transition-all duration-700", color)}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
  );
}

export function OrderBook({ candidates, onSelect, selectedId, className }: OrderBookProps) {
  return (
    <div className={cn("bg-surface border border-border", className)}>
      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_6rem_5rem_8rem_6rem] gap-3 px-4 py-2 border-b border-border">
        {["#", "CANDIDATE", "VERTICAL", "SCORE", "SALARY RANGE", "PERCENTILE"].map((h) => (
          <span key={h} className="font-mono text-xs text-muted tracking-widest">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {candidates.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="font-mono text-muted text-xs">NO CANDIDATES MATCHING FILTERS</p>
        </div>
      ) : (
        candidates.map((c, idx) => (
          <OrderBookRow
            key={c.id}
            candidate={c}
            rank={idx + 1}
            selected={c.id === selectedId}
            onClick={() => onSelect?.(c)}
          />
        ))
      )}
    </div>
  );
}

function OrderBookRow({
  candidate,
  rank,
  selected,
  onClick,
}: {
  candidate: CandidateRow;
  rank: number;
  selected: boolean;
  onClick: () => void;
}) {
  const scoreColor = getScoreColor(candidate.composite_score);

  return (
    <div
      onClick={onClick}
      className={cn(
        "grid grid-cols-[2rem_1fr_6rem_5rem_8rem_6rem] gap-3 px-4 py-3",
        "border-b border-border last:border-0 cursor-pointer transition-colors",
        "hover:bg-bg",
        selected && "bg-green/5 border-l-2 border-l-green"
      )}
    >
      <span className="font-mono text-muted text-xs self-center">{rank}</span>

      <div className="self-center min-w-0">
        <p className="font-mono text-sm text-white truncate">
          {candidate.profiles?.display_name ?? `CAND-${candidate.id.slice(0, 6).toUpperCase()}`}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <ScoreBar score={candidate.composite_score} />
        </div>
      </div>

      <span className="font-mono text-xs text-muted self-center">
        {/* vertical comes from join — show placeholder */}
        TECH
      </span>

      <span className={cn("font-mono text-sm self-center tabular-nums", scoreColor)}>
        {candidate.composite_score.toFixed(1)}
      </span>

      <span className="font-mono text-xs text-muted self-center">
        {candidate.desired_salary_min && candidate.desired_salary_max
          ? formatSalaryBand(candidate.desired_salary_min, candidate.desired_salary_max)
          : "—"}
      </span>

      <span className="font-mono text-xs self-center text-muted">
        {formatPercentile(candidate.percentile_rank)}
      </span>
    </div>
  );
}

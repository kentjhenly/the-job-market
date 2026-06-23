"use client";

import { cn } from "@/lib/utils/cn";
import { formatSalaryBand, formatPercentile } from "@/lib/utils/formatters";
import { scoreVar } from "@/lib/utils/score";
import { ScoreBar } from "@/components/charts/ScoreBar";
import { Badge } from "@/components/ui/Badge";
import { useValueFlash } from "@/hooks/useValueFlash";
import type { Database } from "@/lib/supabase/types";

type CandidateRow = Database["public"]["Tables"]["candidates"]["Row"] & {
  profiles?: { display_name: string } | null;
  candidate_job_postings?: { title: string }[] | null;
};

interface OrderBookProps {
  candidates: CandidateRow[];
  onSelect?: (candidate: CandidateRow) => void;
  selectedId?: string | null;
  className?: string;
}

// Rank · candidate · role · score · salary · percentile. Numeric columns are
// fixed-width and right-aligned so digits line up between rows like a real
// order book.
const COLUMNS = "2.8rem minmax(0,1.5fr) 6rem 7rem 8.5rem 6rem";
// Columns that carry a hairline rule + right alignment (the numeric side).
const RULE = "1px solid var(--border-soft)";

export function OrderBook({ candidates, onSelect, selectedId, className }: OrderBookProps) {
  return (
    <div className={cn("panel overflow-hidden", className)}>
      <div
        className="grid gap-3 px-4 py-2.5"
        style={{ gridTemplateColumns: COLUMNS, borderBottom: "1px solid var(--border-soft)" }}
      >
        <span className="kicker">#</span>
        <span className="kicker">CANDIDATE</span>
        <span className="kicker">ROLE</span>
        <span className="kicker" style={{ textAlign: "right", borderLeft: RULE, paddingLeft: 12 }}>SCORE</span>
        <span className="kicker" style={{ textAlign: "right", borderLeft: RULE, paddingLeft: 12 }}>SALARY RANGE</span>
        <span className="kicker" style={{ textAlign: "right", borderLeft: RULE, paddingLeft: 12 }}>PERCENTILE</span>
      </div>

      {candidates.length === 0 ? (
        <div className="grid-tex px-4 py-14 text-center">
          <p className="kicker" style={{ color: "var(--dim)" }}>// AWAITING CANDIDATES</p>
          <p className="mono mt-2 inline-flex items-center gap-1.5" style={{ fontSize: 11, color: "var(--muted)" }}>
            NO CANDIDATES MATCHING FILTERS
            <span className="cmd-blink" style={{ display: "inline-block", verticalAlign: "middle" }} />
          </p>
        </div>
      ) : (
        candidates.map((c, idx) => (
          <OrderBookRow
            key={c.id}
            candidate={c}
            rank={idx + 1}
            selected={c.id === selectedId}
            isLast={idx === candidates.length - 1}
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
  isLast,
  onClick,
}: {
  candidate: CandidateRow;
  rank: number;
  selected: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  const roleLabel = candidate.candidate_job_postings?.[0]?.title ?? "TECH";
  const flash = useValueFlash(candidate.composite_score);
  const topRank = rank <= 3;

  return (
    <div
      onClick={onClick}
      className={cn(
        "grid cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2",
        flash.dir === "up" && "tick-up",
        flash.dir === "down" && "tick-down"
      )}
      style={{
        gridTemplateColumns: COLUMNS,
        borderBottom: isLast ? "none" : "1px solid var(--border-soft)",
        borderLeft: `2px solid ${selected ? "var(--up)" : "transparent"}`,
        background: selected ? "var(--up-dim)" : undefined,
      }}
    >
      {/* RANK — largest supporting figure, gold for the top of the book */}
      <span
        className="mono tnum"
        style={{ fontSize: 15, fontWeight: 700, color: topRank ? "var(--gold)" : "var(--muted)" }}
      >
        {String(rank).padStart(2, "0")}
      </span>

      {/* CANDIDATE — name + inline score bar */}
      <div className="min-w-0">
        <p className="mono flex items-center gap-1.5 truncate" style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>
          <span className="truncate">
            {candidate.profiles?.display_name ?? `CAND-${candidate.id.slice(0, 4).toUpperCase()}`}
          </span>
          {candidate.is_founder_verified && <Badge variant="gold">VERIFIED</Badge>}
        </p>
        <div className="mt-1.5">
          <ScoreBar score={candidate.composite_score} />
        </div>
      </div>

      {/* ROLE — dimmed supporting field */}
      <span className="mono truncate" style={{ fontSize: 11, color: "var(--dim)" }}>
        {roleLabel.toUpperCase()}
      </span>

      {/* SCORE — second-largest figure, colored by tier, with a transient
          delta tag in a reserved slot so the number never shifts */}
      <div
        className="flex items-baseline justify-end gap-1.5"
        style={{ borderLeft: RULE, paddingLeft: 12 }}
      >
        <span
          className="mono tnum tick-float"
          key={flash.dir ? `${candidate.id}-${flash.delta}` : "idle"}
          style={{
            minWidth: "2.3rem",
            textAlign: "right",
            fontSize: 10.5,
            fontWeight: 600,
            color: flash.dir === "down" ? "var(--down)" : "var(--up)",
            visibility: flash.dir ? "visible" : "hidden",
          }}
        >
          {flash.delta >= 0 ? "▲ +" : "▼ "}
          {Math.abs(flash.delta).toFixed(1)}
        </span>
        <span className="mono tnum" style={{ fontSize: 16, fontWeight: 700, color: scoreVar(candidate.composite_score) }}>
          {candidate.composite_score.toFixed(1)}
        </span>
      </div>

      {/* SALARY RANGE — third tier */}
      <span
        className="mono tnum"
        style={{ fontSize: 11.5, color: "var(--text-2)", textAlign: "right", borderLeft: RULE, paddingLeft: 12 }}
      >
        {candidate.desired_salary_min && candidate.desired_salary_max
          ? formatSalaryBand(candidate.desired_salary_min, candidate.desired_salary_max)
          : "—"}
      </span>

      {/* PERCENTILE — dimmed supporting field */}
      <span
        className="mono tnum"
        style={{ fontSize: 11, color: "var(--muted)", textAlign: "right", borderLeft: RULE, paddingLeft: 12 }}
      >
        {formatPercentile(candidate.percentile_rank)}
      </span>
    </div>
  );
}

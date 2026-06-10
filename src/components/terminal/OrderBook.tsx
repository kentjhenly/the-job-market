import { cn } from "@/lib/utils/cn";
import { formatSalaryBand, formatPercentile } from "@/lib/utils/formatters";
import { ScoreBar } from "@/components/charts/ScoreBar";
import { DepthBar } from "@/components/charts/DepthBar";
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

const COLUMNS = "2.2rem 1.6fr 6rem 5.5rem 9rem 7rem";
const HEADERS = ["#", "CANDIDATE", "VERTICAL", "SCORE", "SALARY RANGE", "PERCENTILE"];

export function OrderBook({ candidates, onSelect, selectedId, className }: OrderBookProps) {
  return (
    <div className={cn("panel overflow-hidden", className)}>
      <div
        className="grid gap-3 px-4 py-2.5"
        style={{ gridTemplateColumns: COLUMNS, borderBottom: "1px solid var(--border-soft)" }}
      >
        {HEADERS.map((h) => (
          <span key={h} className="kicker">
            {h}
          </span>
        ))}
      </div>

      {candidates.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="kicker">NO CANDIDATES MATCHING FILTERS</p>
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
  return (
    <div
      onClick={onClick}
      className="grid cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
      style={{
        gridTemplateColumns: COLUMNS,
        borderBottom: isLast ? "none" : "1px solid var(--border-soft)",
        borderLeft: `2px solid ${selected ? "var(--up)" : "transparent"}`,
        background: selected ? "var(--up-dim)" : "transparent",
      }}
    >
      <span className="mono tnum" style={{ fontSize: 12, color: "var(--muted)" }}>
        {rank}
      </span>

      <div className="min-w-0">
        <p className="mono truncate" style={{ fontSize: 13, color: "var(--text)" }}>
          {candidate.profiles?.display_name ?? `CAND-${candidate.id.slice(0, 6).toUpperCase()}`}
        </p>
        <div className="mt-1.5">
          <ScoreBar score={candidate.composite_score} />
        </div>
      </div>

      <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
        TECH
      </span>

      <DepthBar score={candidate.composite_score} />

      <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
        {candidate.desired_salary_min && candidate.desired_salary_max
          ? formatSalaryBand(candidate.desired_salary_min, candidate.desired_salary_max)
          : "—"}
      </span>

      <span className="mono tnum" style={{ fontSize: 11, color: rank <= 3 ? "var(--gold)" : "var(--muted)" }}>
        {formatPercentile(candidate.percentile_rank)}
      </span>
    </div>
  );
}

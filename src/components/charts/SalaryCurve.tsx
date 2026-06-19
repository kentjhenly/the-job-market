"use client";

import { formatSalary, formatPercentile } from "@/lib/utils/formatters";

interface CurvePoint {
  years_exp: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface SalaryCurveProps {
  curve: CurvePoint[];
  nPoints: number;
  candYears?: number;
  candSalary?: number; // candidate's own salary marker ("you are here")
  candRange?: { min: number; max: number } | null; // employer: posting's offered range
  candPercentile?: number;
  marginalPerYear?: number;
  tone?: "candidate" | "employer";
  height?: number;
}

// Below this many points the band is faded/outlined and labeled low-confidence.
const LOW_N = 8;

export function SalaryCurve({
  curve,
  nPoints,
  candYears,
  candSalary,
  candRange,
  candPercentile,
  marginalPerYear,
  tone = "candidate",
  height = 230,
}: SalaryCurveProps) {
  // Empty / awaiting state — fewer than 2 points can't anchor a curve.
  if (!curve || curve.length < 2 || nPoints < 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5" style={{ height }}>
        <span className="kicker" style={{ color: "var(--dim)" }}>
          AWAITING MARKET DATA
        </span>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--dim)" }}>
          NOT ENOUGH OBSERVATIONS TO MODEL A RANGE YET
        </span>
      </div>
    );
  }

  const accent = tone === "employer" ? "var(--info)" : "var(--up)";
  const lowConf = nPoints < LOW_N;
  const bandFill = `color-mix(in oklch, ${accent} ${lowConf ? 11 : 22}%, transparent)`;
  const bandEdge = `color-mix(in oklch, ${accent} 38%, transparent)`;

  const W = 460;
  const H = height;
  const padL = 52;
  const padR = 16;
  const padT = 18;
  const padB = 30;

  const xs = curve.map((c) => c.years_exp);
  const candYs = [
    ...(candSalary != null ? [candSalary] : []),
    ...(candRange ? [candRange.min, candRange.max] : []),
  ];
  const ysAll = [...curve.flatMap((c) => [c.p25, c.p90]), ...candYs];
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymin = Math.min(...ysAll) * 0.94;
  const ymax = Math.max(...ysAll) * 1.04;
  const X = (v: number) => padL + ((v - xmin) / (xmax - xmin || 1)) * (W - padL - padR);
  const Y = (v: number) => padT + (1 - (v - ymin) / (ymax - ymin || 1)) * (H - padT - padB);

  const lineOf = (key: "p25" | "p50" | "p75" | "p90") =>
    curve.map((c, i) => `${i === 0 ? "M" : "L"}${X(c.years_exp).toFixed(1)},${Y(c[key]).toFixed(1)}`).join(" ");

  // IQR band: p75 across the top, p25 back along the bottom.
  const bandP =
    curve.map((c, i) => `${i === 0 ? "M" : "L"}${X(c.years_exp).toFixed(1)},${Y(c.p75).toFixed(1)}`).join(" ") +
    " " +
    curve
      .slice()
      .reverse()
      .map((c) => `L${X(c.years_exp).toFixed(1)},${Y(c.p25).toFixed(1)}`)
      .join(" ") +
    " Z";

  const yTicks = 4;
  const fmtK = (cents: number) => `${(cents / 100000).toFixed(0)}K`;
  const xTickCount = 4;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => Math.round(xmin + (i / xTickCount) * (xmax - xmin)));

  // Callout position near the candidate's experience point.
  const cx = candYears != null ? X(candYears) : 0;
  const anchorRight = cx > W * 0.62; // flip the label to the left near the right edge
  const calloutX = anchorRight ? cx - 8 : cx + 8;
  const calloutAnchor = anchorRight ? "end" : "start";

  return (
    <div className="w-full">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const v = ymin + (i / yTicks) * (ymax - ymin);
          return (
            <g key={i}>
              <line x1={padL} y1={Y(v)} x2={W - padR} y2={Y(v)} stroke="var(--border)" strokeWidth="1" opacity="0.5" />
              <text x={padL - 8} y={Y(v)} fontSize="9" fontFamily="var(--font-mono)" fill="var(--dim)" textAnchor="end" dominantBaseline="middle">
                {fmtK(v)}
              </text>
            </g>
          );
        })}
        {xTicks.map((yr) => (
          <text key={yr} x={X(yr)} y={H - 10} fontSize="9" fontFamily="var(--font-mono)" fill="var(--dim)" textAnchor="middle">
            {yr}Y
          </text>
        ))}

        {/* IQR band is the hero element */}
        <path
          d={bandP}
          fill={bandFill}
          stroke={lowConf ? bandEdge : "none"}
          strokeWidth={lowConf ? 1 : 0}
          strokeDasharray={lowConf ? "3 3" : undefined}
        />
        {/* faint p90 upper line */}
        <path d={lineOf("p90")} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />
        {/* p50 median — prominent */}
        <path
          d={lineOf("p50")}
          className="spark-line"
          pathLength="1"
          fill="none"
          stroke={accent}
          strokeWidth="2.2"
          strokeDasharray={lowConf ? "5 4" : undefined}
        />

        {candYears != null && (
          <line
            x1={cx}
            y1={padT}
            x2={cx}
            y2={H - padB}
            stroke="var(--gold)"
            strokeWidth="1.2"
            strokeDasharray="4 3"
            opacity="0.75"
          />
        )}

        {/* Employer: offered range as a vertical bar against the band */}
        {candYears != null && candRange && (
          <g stroke="var(--gold)" strokeWidth="2">
            <line x1={cx} y1={Y(candRange.max)} x2={cx} y2={Y(candRange.min)} />
            <line x1={cx - 5} y1={Y(candRange.max)} x2={cx + 5} y2={Y(candRange.max)} />
            <line x1={cx - 5} y1={Y(candRange.min)} x2={cx + 5} y2={Y(candRange.min)} />
          </g>
        )}

        {/* Candidate: "you are here" dot */}
        {candYears != null && candSalary != null && (
          <circle className="spark-dot" cx={cx} cy={Y(candSalary)} r="5" fill="var(--gold)" stroke="var(--bg)" strokeWidth="1.6" />
        )}

        {/* Callout near the experience point */}
        {candYears != null && (candPercentile != null || candRange) && (
          <text
            x={calloutX}
            y={padT + 9}
            fontSize="9.5"
            fontFamily="var(--font-mono)"
            fill="var(--gold)"
            textAnchor={calloutAnchor}
          >
            {candRange
              ? `OFFER · ${candYears}Y`
              : `${formatPercentile(candPercentile ?? 50)} · ${candYears}Y`}
          </text>
        )}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="mono" style={{ fontSize: 10.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="18" height="10" style={{ flexShrink: 0 }}>
            <line x1="0" y1="5" x2="18" y2="5" stroke={accent} strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          MARKET REGRESSION
        </span>
        {candYears != null && candSalary != null && (
          <span className="mono" style={{ fontSize: 10.5, color: "var(--gold)", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="10" height="10" style={{ flexShrink: 0 }}>
              <circle cx="5" cy="5" r="4" fill="var(--gold)" />
            </svg>
            YOUR FLOOR @ {candYears}Y
          </span>
        )}
        {candYears != null && candRange && (
          <span className="mono" style={{ fontSize: 10.5, color: "var(--gold)", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="10" height="10" style={{ flexShrink: 0 }}>
              <circle cx="5" cy="5" r="4" fill="var(--gold)" />
            </svg>
            OFFER @ {candYears}Y
          </span>
        )}
      </div>

      {marginalPerYear != null && marginalPerYear > 0 && (
        <p className="mono mt-2" style={{ fontSize: 10.5, color: "var(--muted)", lineHeight: 1.5, textAlign: "center" }}>
          <span style={{ color: accent }}>≈ +{formatSalary(marginalPerYear)}</span> /MO PER ADDITIONAL YEAR OF EXPERIENCE
        </p>
      )}
    </div>
  );
}

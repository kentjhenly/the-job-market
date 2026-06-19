"use client";

import { formatSalary } from "@/lib/utils/formatters";

interface CurvePoint {
  years_exp: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface ScatterPoint {
  years_exp: number;
  salary: number;
  source?: string;
}

interface SalaryScatterProps {
  points: ScatterPoint[];
  curve?: CurvePoint[];
  nPoints?: number;
  marginalPerYear?: number;
  candYears?: number;
  candSalaryMin?: number;
  candSalaryMax?: number;
  tone?: "candidate" | "employer";
  height?: number;
}

// Below this many points the band is faded/outlined and labeled low-confidence.
const LOW_N = 8;

export function SalaryScatter({
  points,
  curve,
  nPoints,
  marginalPerYear,
  candYears,
  candSalaryMin,
  candSalaryMax,
  tone = "candidate",
  height = 230,
}: SalaryScatterProps) {
  const W = 460;
  const H = height;
  const padL = 52;
  const padR = 16;
  const padT = 18;
  const padB = 30;

  const hasCurve = !!curve && curve.length >= 2;

  if (points.length < 2 && !hasCurve) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5" style={{ height: H }}>
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
  const n = nPoints ?? points.length;
  const lowConf = n < LOW_N;
  const bandFill = `color-mix(in oklch, ${accent} ${lowConf ? 11 : 22}%, transparent)`;
  const bandEdge = `color-mix(in oklch, ${accent} 38%, transparent)`;

  const qcurve = hasCurve ? [...curve!].sort((a, b) => a.years_exp - b.years_exp) : [];

  // Domain spans the raw observations, the modeled band (p25..p90), and the
  // candidate/offered range so nothing the user cares about clips off-canvas.
  const allX = [
    ...points.map((p) => p.years_exp),
    ...qcurve.map((c) => c.years_exp),
    ...(candYears != null ? [candYears] : []),
  ];
  const allY = [
    ...points.map((p) => p.salary),
    ...qcurve.flatMap((c) => [c.p25, c.p90]),
    ...(candSalaryMin != null ? [candSalaryMin] : []),
    ...(candSalaryMax != null ? [candSalaryMax] : []),
  ];
  const xmin = Math.min(...allX);
  const xmax = Math.max(...allX);
  const ymin = Math.max(0, Math.min(...allY)) * 0.96;
  const ymax = Math.max(...allY) * 1.03;
  const X = (v: number) => padL + ((v - xmin) / (xmax - xmin || 1)) * (W - padL - padR);
  const Y = (v: number) => padT + (1 - (v - ymin) / (ymax - ymin || 1)) * (H - padT - padB);

  const lineOf = (key: "p25" | "p50" | "p75" | "p90") =>
    qcurve.map((c, i) => `${i === 0 ? "M" : "L"}${X(c.years_exp).toFixed(1)},${Y(c[key]).toFixed(1)}`).join(" ");

  // IQR band: p75 across the top, p25 back along the bottom.
  const bandP = hasCurve
    ? qcurve.map((c, i) => `${i === 0 ? "M" : "L"}${X(c.years_exp).toFixed(1)},${Y(c.p75).toFixed(1)}`).join(" ") +
      " " +
      [...qcurve]
        .reverse()
        .map((c) => `L${X(c.years_exp).toFixed(1)},${Y(c.p25).toFixed(1)}`)
        .join(" ") +
      " Z"
    : null;

  // Local least-squares fit as the median line when no modeled curve is available.
  let fallbackLine: string | null = null;
  if (!hasCurve && points.length >= 2) {
    const xs = points.map((p) => p.years_exp);
    const ys = points.map((p) => p.salary);
    const m = points.length;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = points.reduce((a, p) => a + p.years_exp * p.salary, 0);
    const sumX2 = xs.reduce((a, x) => a + x * x, 0);
    const slope = (m * sumXY - sumX * sumY) / (m * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / m;
    fallbackLine = `M${X(xmin).toFixed(1)},${Y(slope * xmin + intercept).toFixed(1)} L${X(xmax).toFixed(1)},${Y(
      slope * xmax + intercept
    ).toFixed(1)}`;
  }

  const yTicks = 4;
  const fmtK = (cents: number) => `${(cents / 100000).toFixed(0)}K`;
  const xTickCount = 4;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => Math.round(xmin + (i / xTickCount) * (xmax - xmin)));

  const showRange = candYears != null && (candSalaryMin != null || candSalaryMax != null);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="kicker" style={{ color: "var(--dim)" }}>
          MODELED ESTIMATE
        </span>
        <span className="kicker" style={{ color: lowConf ? "var(--gold)" : "var(--dim)" }}>
          {lowConf ? `LOW CONFIDENCE · MODELED FROM ${n} DATA POINTS` : `MODELED FROM ${n} DATA POINTS`}
        </span>
      </div>

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
        {bandP && (
          <path
            d={bandP}
            fill={bandFill}
            stroke={lowConf ? bandEdge : "none"}
            strokeWidth={lowConf ? 1 : 0}
            strokeDasharray={lowConf ? "3 3" : undefined}
          />
        )}

        {/* Raw observations — the honesty layer behind the model */}
        {points.map((p, i) =>
          p.source === "match" ? (
            <circle key={i} cx={X(p.years_exp)} cy={Y(p.salary)} r="3.5" fill="var(--up)" opacity="0.95" stroke="var(--bg)" strokeWidth="1" />
          ) : (
            <circle key={i} cx={X(p.years_exp)} cy={Y(p.salary)} r="2.5" fill="var(--muted)" opacity="0.4" />
          )
        )}

        {/* faint p90 upper line */}
        {bandP && <path d={lineOf("p90")} fill="none" stroke={accent} strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />}

        {/* p50 median — prominent (or local fit fallback) */}
        {bandP ? (
          <path
            d={lineOf("p50")}
            className="spark-line"
            pathLength="1"
            fill="none"
            stroke={accent}
            strokeWidth="2.2"
            strokeDasharray={lowConf ? "5 4" : undefined}
          />
        ) : (
          fallbackLine && <path d={fallbackLine} fill="none" stroke={accent} strokeWidth="2" strokeDasharray="5 4" />
        )}

        {/* Candidate desired / employer offered range against the band */}
        {showRange && (
          <g>
            <line x1={X(candYears!)} y1={padT} x2={X(candYears!)} y2={H - padB} stroke="var(--gold)" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.8" />
            {candSalaryMin != null && candSalaryMax != null && (
              <line x1={X(candYears!)} y1={Y(candSalaryMin)} x2={X(candYears!)} y2={Y(candSalaryMax)} stroke="var(--gold)" strokeWidth="2.5" opacity="0.9" />
            )}
            {candSalaryMin != null && <circle cx={X(candYears!)} cy={Y(candSalaryMin)} r="4.5" fill="var(--gold)" stroke="var(--bg)" strokeWidth="1.5" />}
            {candSalaryMax != null && <circle cx={X(candYears!)} cy={Y(candSalaryMax)} r="4.5" fill="var(--gold)" stroke="var(--bg)" strokeWidth="1.5" />}
          </g>
        )}
      </svg>

      {marginalPerYear != null && marginalPerYear > 0 && (
        <p className="mono mt-2" style={{ fontSize: 10.5, color: "var(--muted)", lineHeight: 1.5, textAlign: "center" }}>
          <span style={{ color: accent }}>≈ +{formatSalary(marginalPerYear)}</span> /MO PER ADDITIONAL YEAR OF EXPERIENCE
        </p>
      )}
    </div>
  );
}

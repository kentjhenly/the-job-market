"use client";

import { useId } from "react";

interface CurvePoint {
  years_exp: number;
  predicted_salary: number;
  ci_lower: number;
  ci_upper: number;
}

interface SalaryCurveProps {
  curve: CurvePoint[];
  candYears?: number;
  candMin?: number;
  height?: number;
}

export function SalaryCurve({ curve, candYears, candMin, height = 230 }: SalaryCurveProps) {
  const id = useId();
  const gradientId = `curveband-${id}`;

  const W = 460;
  const H = height;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 30;

  const xs = curve.map((c) => c.years_exp);
  const ys = curve.flatMap((c) => [c.ci_lower, c.ci_upper]);
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymin = Math.min(...ys) * 0.96;
  const ymax = Math.max(...ys) * 1.02;
  const X = (v: number) => padL + ((v - xmin) / (xmax - xmin)) * (W - padL - padR);
  const Y = (v: number) => padT + (1 - (v - ymin) / (ymax - ymin)) * (H - padT - padB);

  const lineP = curve
    .map((c, i) => `${i === 0 ? "M" : "L"}${X(c.years_exp).toFixed(1)},${Y(c.predicted_salary).toFixed(1)}`)
    .join(" ");
  const bandP =
    curve.map((c, i) => `${i === 0 ? "M" : "L"}${X(c.years_exp).toFixed(1)},${Y(c.ci_upper).toFixed(1)}`).join(" ") +
    " " +
    curve
      .slice()
      .reverse()
      .map((c) => `L${X(c.years_exp).toFixed(1)},${Y(c.ci_lower).toFixed(1)}`)
      .join(" ") +
    " Z";

  const yTicks = 4;
  // curve values are stored in integer cents — convert to HKD thousands for axis labels
  const fmtK = (cents: number) => `${(cents / 100000).toFixed(0)}K`;

  const xTickCount = 4;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => Math.round(xmin + (i / xTickCount) * (xmax - xmin)));

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--up)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--up)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
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
      <path d={bandP} fill={`url(#${gradientId})`} />
      <path d={lineP} className="spark-line" pathLength="1" fill="none" stroke="var(--up)" strokeWidth="2" />
      {candYears != null && (
        <g>
          <line
            x1={X(candYears)}
            y1={padT}
            x2={X(candYears)}
            y2={H - padB}
            stroke="var(--gold)"
            strokeWidth="1.2"
            strokeDasharray="4 3"
            opacity="0.8"
          />
          {candMin != null && <circle cx={X(candYears)} cy={Y(candMin)} r="4.5" fill="var(--gold)" stroke="var(--bg)" strokeWidth="1.5" />}
        </g>
      )}
    </svg>
  );
}

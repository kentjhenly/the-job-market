"use client";

interface ScatterPoint {
  years_exp: number;
  salary: number;
}

interface SalaryScatterProps {
  points: ScatterPoint[];
  candYears?: number;
  candSalaryMin?: number;
  candSalaryMax?: number;
  height?: number;
}

export function SalaryScatter({ points, candYears, candSalaryMin, candSalaryMax, height = 230 }: SalaryScatterProps) {
  const W = 460;
  const H = height;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 30;

  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ height: H }}>
        <p className="kicker">AWAITING MARKET DATA</p>
      </div>
    );
  }

  const xs = points.map((p) => p.years_exp);
  const ys = points.map((p) => p.salary);
  const xmin = Math.min(...xs, candYears ?? Infinity);
  const xmax = Math.max(...xs, candYears ?? -Infinity);
  const ymin = Math.min(...ys, candSalaryMin ?? Infinity) * 0.96;
  const ymax = Math.max(...ys, candSalaryMax ?? -Infinity) * 1.02;
  const X = (v: number) => padL + ((v - xmin) / (xmax - xmin)) * (W - padL - padR);
  const Y = (v: number) => padT + (1 - (v - ymin) / (ymax - ymin)) * (H - padT - padB);

  // least-squares linear regression
  const n = points.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = points.reduce((a, p) => a + p.years_exp * p.salary, 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const lineP = `M${X(xmin).toFixed(1)},${Y(slope * xmin + intercept).toFixed(1)} L${X(xmax).toFixed(1)},${Y(slope * xmax + intercept).toFixed(1)}`;

  const yTicks = 4;
  const fmtK = (cents: number) => `${(cents / 100000).toFixed(0)}K`;

  const xTickCount = 4;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => Math.round(xmin + (i / xTickCount) * (xmax - xmin)));

  return (
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
      {points.map((p, i) => (
        <circle key={i} cx={X(p.years_exp)} cy={Y(p.salary)} r="3" fill="var(--muted)" opacity="0.5" />
      ))}
      <path d={lineP} fill="none" stroke="var(--up)" strokeWidth="2" />
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
          {candSalaryMin != null && <circle cx={X(candYears)} cy={Y(candSalaryMin)} r="4.5" fill="var(--gold)" stroke="var(--bg)" strokeWidth="1.5" />}
          {candSalaryMax != null && <circle cx={X(candYears)} cy={Y(candSalaryMax)} r="4.5" fill="var(--gold)" stroke="var(--bg)" strokeWidth="1.5" />}
        </g>
      )}
    </svg>
  );
}

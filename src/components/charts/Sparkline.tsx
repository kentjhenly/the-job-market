"use client";

import { useId } from "react";

interface SparklineProps {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
  fill?: boolean;
  className?: string;
}

export function Sparkline({ data, w = 320, h = 64, color, fill = true, className }: SparklineProps) {
  const id = useId();

  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = 4;
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / range) * (h - pad * 2);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${h} L${x(0).toFixed(1)},${h} Z`;
  const up = data[data.length - 1] >= data[0];
  const col = color || (up ? "var(--up)" : "var(--down)");
  const gradientId = `sparkline-${id}`;

  // The chart SVG uses preserveAspectRatio="none" so the line fills the panel
  // width, which non-uniformly stretches the SVG's coordinate space in BOTH
  // axes (width is responsive, height flexes). Any <circle> drawn inside that
  // space — even in a nested SVG — inherits the stretch and renders as an
  // ellipse. So the end dot is drawn as a fixed-size HTML element overlaid in
  // undistorted DOM space, positioned by percentage of the chart box.
  const dotR = 2.6;
  const dotLeft = (x(data.length - 1) / w) * 100;
  const dotTop = (y(data[data.length - 1]) / h) * 100;

  return (
    <div className={className} style={{ position: "relative", height: h }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.22" />
            <stop offset="100%" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        {fill && <path d={area} fill={`url(#${gradientId})`} />}
        <path d={line} className="spark-line" pathLength="1" fill="none" stroke={col} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span
        className="spark-dot"
        style={{
          position: "absolute",
          left: `${dotLeft}%`,
          top: `${dotTop}%`,
          width: dotR * 2,
          height: dotR * 2,
          background: col,
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

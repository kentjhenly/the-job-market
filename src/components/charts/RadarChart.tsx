"use client";

import { useState } from "react";

interface RadarDimension {
  axis: string;
  you: number;
  avg?: number;
  desc?: string;
}

interface RadarChartProps {
  dims: RadarDimension[];
  size?: number;
}

export function RadarChart({ dims, size = 240 }: RadarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 34;
  const n = dims.length;
  const ang = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
  const pt = (i: number, r: number): [number, number] => [
    cx + Math.cos(ang(i)) * R * (r / 100),
    cy + Math.sin(ang(i)) * R * (r / 100),
  ];
  const polyPoints = (key: "you" | "avg") =>
    dims.map((d, i) => pt(i, d[key] ?? 0).map((v) => v.toFixed(1)).join(",")).join(" ");
  const rings = [25, 50, 75, 100];
  const active = hovered != null ? dims[hovered] : null;
  const hasAvg = dims.some((d) => d.avg != null);

  function toggleHover(i: number) {
    setHovered((prev) => (prev === i ? null : i));
  }

  return (
    <div className="w-full">
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", overflow: "visible" }}>
        {rings.map((r) => (
          <polygon
            key={r}
            points={dims.map((_, i) => pt(i, r).map((v) => v.toFixed(1)).join(",")).join(" ")}
            fill="none"
            stroke="var(--border)"
            strokeWidth="1"
            opacity={r === 100 ? 0.9 : 0.5}
          />
        ))}
        {dims.map((_, i) => {
          const [x, y] = pt(i, 100);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="1" opacity="0.4" />;
        })}
        {hasAvg && (
          <polygon
            points={polyPoints("avg")}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="1.2"
            strokeDasharray="4 3"
            opacity="0.6"
          />
        )}
        <polygon className="radar-you" points={polyPoints("you")} fill="var(--up)" fillOpacity="0.14" stroke="var(--up)" strokeWidth="1.8" />
        {dims.map((d, i) => {
          const [x, y] = pt(i, d.you);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={hovered === i ? 5 : 3.5}
              fill="var(--up)"
              style={{ cursor: "pointer", transition: "r .12s" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={(e) => { e.preventDefault(); toggleHover(i); }}
            />
          );
        })}
        {dims.map((d, i) => {
          const [x, y] = pt(i, 116);
          return (
            <text
              key={i}
              x={x}
              y={y}
              fontSize="8.5"
              fontFamily="var(--font-mono)"
              letterSpacing="0.5"
              fill={hovered === i ? "var(--up)" : "var(--muted)"}
              textAnchor={Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end"}
              dominantBaseline="middle"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={(e) => { e.preventDefault(); toggleHover(i); }}
            >
              {d.axis}
            </text>
          );
        })}
      </svg>

      {hasAvg && (
        <div className="mt-1.5 flex items-center justify-end gap-3 px-1">
          <span className="flex items-center gap-1.5">
            <svg width="16" height="2"><line x1="0" y1="1" x2="16" y2="1" stroke="var(--up)" strokeWidth="1.8" /></svg>
            <span className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em" }}>YOU</span>
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="2"><line x1="0" y1="1" x2="16" y2="1" stroke="var(--muted)" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.6" /></svg>
            <span className="mono" style={{ fontSize: 9, color: "var(--dim)", letterSpacing: "0.08em" }}>AVG</span>
          </span>
        </div>
      )}

      <div
        className="mt-3"
        style={{
          minHeight: 80,
          border: "1px solid var(--border-soft)",
          background: "var(--surface-2)",
          borderRadius: "var(--r)",
          padding: "10px 12px",
        }}
      >
        {active ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="kicker" style={{ color: "var(--up)" }}>
                {active.axis}
              </span>
              <span className="mono tnum" style={{ fontSize: 11, color: "var(--text)" }}>
                {Math.round(active.you)}/100
                {active.avg != null && (
                  <span style={{ color: "var(--dim)", marginLeft: 6 }}>AVG {Math.round(active.avg)}</span>
                )}
              </span>
            </div>
            {active.desc && (
              <p className="mono mt-1.5" style={{ fontSize: 10.5, color: "var(--muted)", lineHeight: 1.55 }}>
                {active.desc}
              </p>
            )}
          </>
        ) : (
          <p className="mono" style={{ fontSize: 10.5, color: "var(--dim)", lineHeight: 1.55 }}>
            Tap a vertex to see what it measures and how to raise it.
          </p>
        )}
      </div>
    </div>
  );
}

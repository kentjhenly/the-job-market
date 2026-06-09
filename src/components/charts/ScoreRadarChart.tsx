"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface ScoreDimension {
  subject: string;
  score: number;
  peerAvg: number;
}

interface ScoreRadarChartProps {
  dimensions: ScoreDimension[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ScoreDimension;
  return (
    <div className="bg-surface border border-border p-3 font-mono text-xs">
      <p className="text-muted">{d.subject}</p>
      <p className="text-green mt-1">YOU: {d.score.toFixed(0)}</p>
      <p className="text-muted">AVG: {d.peerAvg.toFixed(0)}</p>
    </div>
  );
}

export function ScoreRadarChart({ dimensions }: ScoreRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={dimensions} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
        <PolarGrid stroke="#1a1a1a" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: "#a0a0a0", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Radar
          dataKey="peerAvg"
          stroke="#a0a0a0"
          strokeWidth={1}
          fill="#a0a0a0"
          fillOpacity={0.05}
        />
        <Radar
          dataKey="score"
          stroke="#00ff41"
          strokeWidth={1.5}
          fill="#00ff41"
          fillOpacity={0.1}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

"use client";

import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

interface ScoreHistorySparklineProps {
  data: { recorded_at: string; composite_score: number }[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border px-2 py-1 font-mono text-xs text-green">
      {payload[0].value.toFixed(1)}
    </div>
  );
}

export function ScoreHistorySparkline({ data }: ScoreHistorySparklineProps) {
  if (data.length < 2) return null;

  const sorted = [...data].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={sorted} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="composite_score"
          stroke="#00ff41"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: "#00ff41" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

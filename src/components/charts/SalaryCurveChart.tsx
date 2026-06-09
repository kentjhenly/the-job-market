"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { formatSalary } from "@/lib/utils/formatters";

interface CurvePoint {
  years_exp: number;
  predicted_salary: number;
  ci_lower: number;
  ci_upper: number;
}

interface SalaryCurveChartProps {
  curve: CurvePoint[];
  candidateYearsExp?: number;
  candidateSalaryMin?: number;
  className?: string;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as CurvePoint;
  return (
    <div className="bg-surface border border-border p-3 font-mono text-xs">
      <p className="text-muted">{label} YRS EXP</p>
      <p className="text-green mt-1">{formatSalary(d.predicted_salary)}</p>
      <p className="text-muted text-xs mt-0.5">
        {formatSalary(d.ci_lower)} – {formatSalary(d.ci_upper)}
      </p>
    </div>
  );
}

export function SalaryCurveChart({
  curve,
  candidateYearsExp,
  candidateSalaryMin,
}: SalaryCurveChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={curve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00ff41" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#00ff41" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00ff41" stopOpacity={0.05} />
            <stop offset="95%" stopColor="#00ff41" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />

        <XAxis
          dataKey="years_exp"
          tick={{ fill: "#a0a0a0", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
          tickLine={false}
          axisLine={{ stroke: "#1a1a1a" }}
          label={{ value: "YRS EXP", position: "insideBottom", fill: "#a0a0a0", fontSize: 9 }}
        />
        <YAxis
          tickFormatter={(v) => formatSalary(v, "")}
          tick={{ fill: "#a0a0a0", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
          tickLine={false}
          axisLine={{ stroke: "#1a1a1a" }}
          width={55}
        />

        <Tooltip content={<CustomTooltip />} />

        <Area
          type="monotone"
          dataKey="ci_upper"
          stroke="none"
          fill="url(#ciGradient)"
          fillOpacity={1}
        />
        <Area
          type="monotone"
          dataKey="ci_lower"
          stroke="none"
          fill="#0a0a0a"
          fillOpacity={1}
        />
        <Area
          type="monotone"
          dataKey="predicted_salary"
          stroke="#00ff41"
          strokeWidth={1.5}
          fill="url(#salaryGradient)"
        />

        {candidateYearsExp !== undefined && (
          <ReferenceLine
            x={candidateYearsExp}
            stroke="#ffffff"
            strokeDasharray="4 2"
            strokeWidth={1}
            label={{
              value: "YOU",
              fill: "#ffffff",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
        )}

        {candidateSalaryMin !== undefined && (
          <ReferenceLine
            y={candidateSalaryMin}
            stroke="#ffd700"
            strokeDasharray="4 2"
            strokeWidth={1}
            label={{
              value: "FLOOR",
              fill: "#ffd700",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

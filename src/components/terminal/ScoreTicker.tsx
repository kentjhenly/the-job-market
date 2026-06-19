"use client";

import { useCountUp } from "@/hooks/useCountUp";
import { scoreVar } from "@/lib/utils/score";
import { cn } from "@/lib/utils/cn";

interface ScoreTickerProps {
  score: number;
  size?: "xl" | "lg" | "md";
  decimals?: number;
  suffix?: string;
  color?: string;
  className?: string;
}

const SIZES: Record<NonNullable<ScoreTickerProps["size"]>, number> = {
  xl: 52,
  lg: 40,
  md: 28,
};

export function ScoreTicker({ score, size = "lg", decimals = 1, suffix, color, className }: ScoreTickerProps) {
  const value = useCountUp(score, 1000);
  const fontSize = SIZES[size];

  return (
    <span
      className={cn("mono tnum", className)}
      style={{ fontSize, fontWeight: 700, color: color ?? scoreVar(score), lineHeight: 1, letterSpacing: "-0.01em" }}
    >
      {value.toFixed(decimals)}
      {suffix && (
        <span style={{ fontSize: fontSize * 0.4, color: "var(--muted)", marginLeft: 4 }}>{suffix}</span>
      )}
    </span>
  );
}

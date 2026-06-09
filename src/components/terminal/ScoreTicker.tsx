"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { SCORE_TIERS } from "@/lib/utils/constants";

interface ScoreTickerProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

function getScoreColor(score: number) {
  if (score >= SCORE_TIERS.gold) return "text-gold";
  if (score >= SCORE_TIERS.green) return "text-green";
  if (score < SCORE_TIERS.red) return "text-danger";
  return "text-muted";
}

export function ScoreTicker({ score, size = "md", showLabel, className }: ScoreTickerProps) {
  const [displayed, setDisplayed] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const DURATION = 1500;

  useEffect(() => {
    const target = score;
    startRef.current = null;

    function step(timestamp: number) {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(eased * target);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    }

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [score]);

  const textSizes = { sm: "text-2xl", md: "text-4xl", lg: "text-6xl" };
  const color = getScoreColor(score);

  return (
    <div className={cn("font-mono animate-count-up", className)}>
      <span className={cn(textSizes[size], color, "tabular-nums font-bold")}>
        {displayed.toFixed(1)}
      </span>
      {showLabel && (
        <span className="text-muted text-xs tracking-widest ml-2 align-middle">/ 100</span>
      )}
    </div>
  );
}

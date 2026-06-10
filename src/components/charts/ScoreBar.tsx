import { scoreVar } from "@/lib/utils/score";

interface ScoreBarProps {
  score: number;
  w?: number;
}

export function ScoreBar({ score, w = 96 }: ScoreBarProps) {
  return (
    <div style={{ width: w, height: 5, background: "var(--surface-3)", borderRadius: 3, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.min(score, 100)}%`,
          background: scoreVar(score),
          borderRadius: 3,
          transition: "width .7s cubic-bezier(.2,.7,.3,1)",
        }}
      />
    </div>
  );
}

import { scoreVar } from "@/lib/utils/score";

interface DepthBarProps {
  score: number;
  max?: number;
}

export function DepthBar({ score, max = 100 }: DepthBarProps) {
  const col = scoreVar(score);
  return (
    <div style={{ position: "relative", height: 22, display: "flex", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${(score / max) * 100}%`,
          background: col,
          opacity: 0.1,
          borderRadius: 2,
          transition: "width .7s cubic-bezier(.2,.7,.3,1)",
        }}
      />
      <span className="mono tnum" style={{ position: "relative", fontSize: 13, fontWeight: 600, color: col }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

import { cn } from "@/lib/utils/cn";

interface DataRowProps {
  label: string;
  value: React.ReactNode;
  color?: "up" | "down" | "gold";
  className?: string;
}

export function DataRow({ label, value, color, className }: DataRowProps) {
  const colorVar =
    color === "up" ? "var(--up)" : color === "down" ? "var(--down)" : color === "gold" ? "var(--gold)" : "var(--text)";

  return (
    <div className={cn("datarow", className)}>
      <span className="dr-label">{label}</span>
      <span className="dr-value" style={{ color: colorVar }}>
        {value}
      </span>
    </div>
  );
}

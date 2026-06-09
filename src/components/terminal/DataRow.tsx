import { cn } from "@/lib/utils/cn";

interface DataRowProps {
  label: string;
  value: React.ReactNode;
  valueColor?: "green" | "gold" | "danger" | "muted" | "white";
  className?: string;
}

const valueColors = {
  green: "text-green",
  gold: "text-gold",
  danger: "text-danger",
  muted: "text-muted",
  white: "text-white",
};

export function DataRow({ label, value, valueColor = "white", className }: DataRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 border-b border-border last:border-0",
        className
      )}
    >
      <span className="font-mono text-xs text-muted tracking-wider uppercase">{label}</span>
      <span className={cn("font-mono text-sm", valueColors[valueColor])}>{value}</span>
    </div>
  );
}

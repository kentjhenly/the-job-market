import { cn } from "@/lib/utils/cn";

interface LiveDotProps {
  label?: string;
  className?: string;
}

export function LiveDot({ label, className }: LiveDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-[7px]", className)}>
      <span className="live-dot" />
      {label && (
        <span className="kicker" style={{ color: "var(--up)" }}>
          {label}
        </span>
      )}
    </span>
  );
}

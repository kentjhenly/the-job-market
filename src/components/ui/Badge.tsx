import { cn } from "@/lib/utils/cn";

type BadgeVariant = "up" | "down" | "gold" | "muted" | "outline" | "green" | "danger";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const variants: Record<BadgeVariant, string> = {
  up: "badge-up",
  green: "badge-up",
  down: "badge-down",
  danger: "badge-down",
  gold: "badge-gold",
  muted: "badge-muted",
  outline: "text-text border-border bg-transparent",
};

export function Badge({ variant = "muted", children, className, style }: BadgeProps) {
  return (
    <span className={cn("badge", variants[variant], className)} style={style}>
      {children}
    </span>
  );
}

import { cn } from "@/lib/utils/cn";

type BadgeVariant = "green" | "gold" | "danger" | "muted" | "outline";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  green: "text-green border-green/30 bg-green/10",
  gold: "text-gold border-gold/30 bg-gold/10",
  danger: "text-danger border-danger/30 bg-danger/10",
  muted: "text-muted border-border bg-bg",
  outline: "text-white border-border bg-transparent",
};

export function Badge({ variant = "muted", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block border font-mono text-xs px-2 py-0.5 tracking-wider",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

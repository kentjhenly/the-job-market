import { cn } from "@/lib/utils/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-green text-bg font-bold hover:bg-green/90 disabled:opacity-50",
  ghost:
    "bg-transparent text-muted border border-border hover:border-green hover:text-green",
  danger:
    "bg-danger text-white hover:bg-danger/90 disabled:opacity-50",
  outline:
    "bg-transparent text-white border border-border hover:border-green hover:text-green",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, children, disabled, ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "font-mono tracking-widest transition-colors cursor-pointer",
        "disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? "LOADING..." : children}
    </button>
  )
);

Button.displayName = "Button";

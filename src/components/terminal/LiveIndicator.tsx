import { cn } from "@/lib/utils/cn";

export function LiveIndicator({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full bg-green animate-pulse-green",
        className
      )}
    />
  );
}

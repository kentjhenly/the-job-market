import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, children, footer, className }: StatCardProps) {
  return (
    <div className={cn("panel p-4", className)}>
      <p className="kicker mb-3">{label}</p>
      {children}
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}

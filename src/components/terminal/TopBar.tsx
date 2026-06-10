import Link from "next/link";
import { Clock } from "./Clock";

interface TopBarProps {
  homeHref: string;
  stat?: { label: string; value: string };
}

export function TopBar({ homeHref, stat }: TopBarProps) {
  return (
    <header className="flex h-[50px] shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4">
      <div className="flex min-w-0 items-center gap-[18px]">
        <Link
          href={homeHref}
          className="mono shrink-0 whitespace-nowrap"
          style={{ color: "var(--up)", fontSize: 13, letterSpacing: "0.16em", fontWeight: 700 }}
        >
          ◧ THE JOB MARKET
        </Link>
        <span className="badge badge-muted" style={{ borderRadius: 3 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--up)" }} />
          MKT OPEN
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {stat && (
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            {stat.label} <span style={{ color: "var(--up)", fontWeight: 600 }}>{stat.value}</span>
          </span>
        )}
        <Clock />
      </div>
    </header>
  );
}

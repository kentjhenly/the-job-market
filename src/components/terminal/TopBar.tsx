import Link from "next/link";
import { Clock } from "./Clock";
import { SignOutButton } from "./SignOutButton";

type Stat = { label: string; value: string; color?: string; href?: string };

interface TopBarProps {
  homeHref: string;
  stat?: Stat | Stat[];
  showSignOut?: boolean;
}

export function TopBar({ homeHref, stat, showSignOut = true }: TopBarProps) {
  const stats = stat ? (Array.isArray(stat) ? stat : [stat]) : [];

  return (
    <header className="flex h-[50px] shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4">
      <div className="flex min-w-0 items-center gap-[18px]">
        <Link
          href={homeHref}
          className="mono shrink-0 whitespace-nowrap"
          style={{ color: "var(--gold)", fontSize: 13, letterSpacing: "0.16em", fontWeight: 700 }}
        >
          ◧ THE JOB MARKET
        </Link>
        <span className="hidden sm:inline-flex">
          <span className="badge badge-muted" style={{ borderRadius: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--up)" }} />
            MKT OPEN
          </span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {stats.map((s) => (
          <span key={s.label} className="mono hidden sm:inline" style={{ fontSize: 11, color: "var(--muted)" }}>
            {s.label}{" "}
            {s.href ? (
              <Link href={s.href} style={{ color: s.color ?? "var(--up)", fontWeight: 600 }}>
                {s.value} →
              </Link>
            ) : (
              <span style={{ color: s.color ?? "var(--up)", fontWeight: 600 }}>{s.value}</span>
            )}
          </span>
        ))}
        <span className="hidden sm:inline"><Clock /></span>
        {showSignOut && <SignOutButton />}
      </div>
    </header>
  );
}

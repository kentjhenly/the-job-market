"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  href: string;
  label: string;
}

export function Sidebar({
  nav,
  role,
  label,
}: {
  nav: NavItem[];
  role: "candidate" | "employer";
  label?: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-44 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface sm:flex">
      <div className="px-4 pb-2.5 pt-3.5">
        <span className="kicker" style={{ color: "var(--dim)" }}>
          {label || (role === "employer" ? "EMPLOYER" : "CANDIDATE")}
        </span>
      </div>
      <nav className="flex flex-col border-t border-border">
        {nav.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className={cn("navitem", active && "active")}>
              <span className="ni-dot" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="flex shrink-0 items-stretch overflow-x-auto border-t border-border bg-surface sm:hidden"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {nav.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className="mono flex min-w-0 flex-1 items-center justify-center whitespace-nowrap px-2 py-3"
            style={{
              fontSize: 10,
              letterSpacing: "0.08em",
              color: active ? "var(--text)" : "var(--muted)",
              borderTop: `2px solid ${active ? "var(--up)" : "transparent"}`,
              minHeight: 44,
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

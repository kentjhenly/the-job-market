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
    <aside className="flex w-44 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface">
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

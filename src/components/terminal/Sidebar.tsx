"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  href: string;
  label: string;
}

export function Sidebar({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="w-44 shrink-0 overflow-y-auto border-r border-border bg-surface">
      <nav className="flex flex-col py-2">
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

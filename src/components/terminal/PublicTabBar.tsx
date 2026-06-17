"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function PublicTabBar() {
  const pathname = usePathname();

  return (
    <div className="flex h-11 items-center justify-between border-b border-border bg-surface px-6">
      <div className="tabbar">
        <Link href="/" className={cn("tab", pathname === "/" && "active")}>
          OVERVIEW
        </Link>
        <Link href="/ticker" className={cn("tab", pathname === "/ticker" && "active")}>
          LIVE FEED
        </Link>
      </div>
      <div className="flex gap-2.5">
        <Link href="/sign-in" className="btn btn-ghost btn-sm">
          SIGN IN
        </Link>
        <Link href="/sign-up" className="btn btn-primary btn-sm">
          SIGN UP →
        </Link>
      </div>
    </div>
  );
}

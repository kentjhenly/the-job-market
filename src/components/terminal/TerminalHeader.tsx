"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LiveIndicator } from "./LiveIndicator";

interface TerminalHeaderProps {
  role: "candidate" | "employer";
  breadcrumb?: string;
}

export function TerminalHeader({ role, breadcrumb }: TerminalHeaderProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString("en-SG", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-10 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <Link
          href={role === "employer" ? "/employer/dashboard" : "/dashboard"}
          className="font-mono text-green text-xs tracking-widest hover:text-green/80 transition-colors"
        >
          TJM
        </Link>
        {breadcrumb && (
          <>
            <span className="text-border font-mono text-xs">/</span>
            <span className="font-mono text-muted text-xs tracking-wide">{breadcrumb}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <LiveIndicator />
          <span className="font-mono text-muted text-xs">LIVE</span>
        </div>
        <span className="font-mono text-muted text-xs">{time}</span>
        <span className="font-mono text-xs border border-border px-2 py-0.5 text-muted tracking-wider">
          {role.toUpperCase()}
        </span>
      </div>
    </header>
  );
}

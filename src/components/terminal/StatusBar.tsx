"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CommandDef } from "@/lib/utils/commands";
import { LiveDot } from "./LiveDot";
import { useCommandConsole } from "./CommandConsoleContext";

function formatSession(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor(totalSeconds / 60) % 60;
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function StatusBar({ fkeys }: { fkeys: [string, CommandDef][] }) {
  const [lat, setLat] = useState(12);
  const [session, setSession] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const { openHelp } = useCommandConsole();

  useEffect(() => {
    const id = setInterval(() => {
      setSession((s) => s + 1);
      if (Math.random() < 0.35) setLat(8 + Math.floor(Math.random() * 11));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const entry = fkeys.find(([key]) => key === e.key);
      if (!entry) return;
      e.preventDefault();
      const [, cmd] = entry;
      if (cmd.action === "help") openHelp();
      else if (cmd.href) router.push(cmd.href);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fkeys, openHelp, router]);

  return (
    <footer className="statusbar">
      <div className="flex items-center gap-0.5 overflow-hidden">
        {fkeys.map(([key, cmd]) => {
          const active = cmd.href ? pathname === cmd.href || pathname.startsWith(`${cmd.href}/`) : false;
          return (
            <span
              key={key}
              className={`fkey${active ? " active" : ""}`}
              onClick={() => (cmd.action === "help" ? openHelp() : cmd.href && router.push(cmd.href))}
            >
              <b>{key}</b>
              <span>{cmd.cmd}</span>
            </span>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="mono tnum" style={{ fontSize: 10.5, color: "var(--dim)" }}>
          LAT <span style={{ color: "var(--up)" }}>{lat}MS</span>
        </span>
        <span className="mono tnum" style={{ fontSize: 10.5, color: "var(--dim)" }}>
          SESSION {formatSession(session)}
        </span>
        <LiveDot label="CONNECTED" />
      </div>
    </footer>
  );
}

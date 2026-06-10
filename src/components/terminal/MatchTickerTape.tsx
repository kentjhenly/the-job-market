"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { LiveDot } from "./LiveDot";
import { cn } from "@/lib/utils/cn";

interface TickerItem {
  id: string;
  vertical: string;
  salary_band: string | null;
  role_label: string | null;
  created_at: string;
}

export function MatchTickerTape({ className }: { className?: string }) {
  const [items, setItems] = useState<TickerItem[]>([]);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    supabase
      .from("match_ticker_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setItems(data as TickerItem[]);
      });

    const channel = supabase
      .channel("ticker")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_ticker_events" },
        (payload) => {
          setItems((prev) => [payload.new as TickerItem, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className={cn("ticker-wrap flex h-[30px] items-center", className)}
      style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--border-soft)" }}
    >
      <span
        className="inline-flex h-full shrink-0 items-center gap-2 px-3.5"
        style={{ position: "sticky", left: 0, zIndex: 2, background: "var(--bg-deep)", borderRight: "1px solid var(--border)" }}
      >
        <LiveDot />
        <span className="kicker" style={{ color: "var(--text-2)" }}>
          MATCHES
        </span>
      </span>
      <div className="ticker-track" style={{ "--tdur": "80s" } as React.CSSProperties}>
        {[...items, ...items].map((item, i) => (
          <span
            key={`${item.id}-${i}`}
            className="inline-flex items-center gap-[9px] px-[22px]"
            style={{ borderRight: "1px solid var(--border-soft)" }}
          >
            <span className="mono" style={{ fontSize: 11, color: "var(--text-2)", letterSpacing: "0.06em" }}>
              {item.role_label ?? "ENGINEER"}
            </span>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              {item.salary_band ?? `[${item.vertical.toUpperCase()}]`}
            </span>
            <span className="mono tnum" style={{ fontSize: 11, color: "var(--up)", fontWeight: 600 }}>
              ▲ MATCH
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

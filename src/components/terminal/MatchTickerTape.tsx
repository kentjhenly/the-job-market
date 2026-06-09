"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

interface TickerItem {
  id: string;
  vertical: string;
  salary_band: string | null;
  role_label: string | null;
  created_at: string;
}

function formatTickerItem(item: TickerItem): string {
  const parts = [
    `[${item.vertical.toUpperCase()}]`,
    item.role_label ?? "ENGINEER",
    "MATCH",
  ];
  if (item.salary_band) parts.push(`· ${item.salary_band}`);
  return parts.join(" ");
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

  const text = [...items, ...items].map(formatTickerItem).join("   ·   ");

  return (
    <div
      className={cn(
        "h-8 bg-bg border-b border-border overflow-hidden flex items-center",
        className
      )}
    >
      <div className="shrink-0 w-16 h-full bg-surface border-r border-border flex items-center justify-center">
        <span className="font-mono text-green text-xs tracking-widest">LIVE</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <div
          className="animate-ticker whitespace-nowrap inline-block"
          style={{ paddingLeft: "100%" }}
        >
          <span className="font-mono text-xs text-muted tracking-wide">{text}</span>
        </div>
      </div>
    </div>
  );
}

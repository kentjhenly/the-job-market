"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { LiveIndicator } from "@/components/terminal/LiveIndicator";

interface TickerItem {
  id: string;
  vertical: string;
  salary_band: string | null;
  role_label: string | null;
  match_type: string;
  created_at: string;
}

export default function PublicTickerPage() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    supabase
      .from("match_ticker_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setItems(data as TickerItem[]);
      });

    const channel = supabase
      .channel("ticker-public")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_ticker_events" },
        (payload) => {
          setItems((prev) => [payload.new as TickerItem, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-mono text-green text-sm tracking-widest">
          ← THE JOB MARKET
        </Link>
        <div className="flex items-center gap-2">
          <LiveIndicator />
          <span className="font-mono text-xs text-muted">LIVE MATCH FEED</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="font-mono text-green text-sm tracking-widest">MATCH TAPE</h1>
          <p className="text-muted text-xs font-mono mt-1">
            ANONYMISED RECENT MATCHES · UPDATES IN REAL TIME
          </p>
        </div>

        {items.length === 0 ? (
          <div className="border border-border bg-surface p-12 text-center">
            <p className="font-mono text-muted text-xs animate-pulse">
              WAITING FOR MATCH EVENTS...
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between border border-border bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-muted">
                    [{item.vertical.toUpperCase()}]
                  </span>
                  <span className="font-mono text-sm text-white">
                    {item.role_label ?? "ENGINEER"}{" "}
                    <span className="text-green">MATCH</span>
                  </span>
                  {item.salary_band && (
                    <span className="font-mono text-xs text-gold">{item.salary_band}</span>
                  )}
                </div>
                <span className="font-mono text-xs text-muted">
                  {formatRelativeTime(item.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

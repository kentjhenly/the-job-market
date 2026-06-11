"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatRelativeTime, formatSalary } from "@/lib/utils/formatters";
import { LiveDot } from "@/components/terminal/LiveDot";

interface TickerItem {
  id: string;
  vertical: string;
  salary_band: string | null;
  role_label: string | null;
  salary: number | null;
  delta_pct: number | null;
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
  }, [supabase]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <nav className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link
          href="/"
          className="mono"
          style={{ color: "var(--up)", fontSize: 13, letterSpacing: "0.16em", fontWeight: 700 }}
        >
          ← THE JOB MARKET
        </Link>
        <LiveDot label="LIVE MATCH FEED" />
      </nav>

      <main className="mx-auto max-w-3xl p-6">
        <div className="mb-6">
          <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
            MATCH TAPE
          </h1>
          <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
            ANONYMISED RECENT MATCHES · UPDATES IN REAL TIME
          </p>
        </div>

        {items.length === 0 ? (
          <div className="panel p-12 text-center">
            <p className="kicker animate-pulse">WAITING FOR MATCH EVENTS...</p>
          </div>
        ) : (
          <div className="view-enter space-y-1">
            {items.map((item) => (
              <div key={item.id} className="panel flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                    [{item.vertical.toUpperCase()}]
                  </span>
                  <span className="mono" style={{ fontSize: 13, color: "var(--text)" }}>
                    {item.role_label ?? "ENGINEER"} <span style={{ color: "var(--up)" }}>MATCH</span>
                  </span>
                  {(item.salary != null || item.salary_band) && (
                    <span className="mono tnum" style={{ fontSize: 11, color: "var(--gold)" }}>
                      {item.salary != null ? formatSalary(item.salary) : item.salary_band}
                    </span>
                  )}
                  {item.delta_pct != null && (
                    <span
                      className="mono tnum"
                      style={{
                        fontSize: 11,
                        color: item.delta_pct >= 0 ? "var(--up)" : "var(--down)",
                        fontWeight: 600,
                      }}
                    >
                      {item.delta_pct >= 0 ? "▲ +" : "▼ "}
                      {Math.abs(item.delta_pct).toFixed(1)}%
                    </span>
                  )}
                </div>
                <span className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>
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

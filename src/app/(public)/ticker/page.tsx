"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
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
  fresh?: boolean;
}

const COLUMNS = ["ROLE", "SALARY", "Δ MARKET", "AGE"];
const GRID_COLS = "1.4fr 1fr 0.7fr 0.6fr";

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
          const fresh = { ...(payload.new as TickerItem), fresh: true };
          setItems((prev) => [fresh, ...prev].slice(0, 100));
          setTimeout(() => {
            setItems((prev) => prev.map((it) => (it.id === fresh.id ? { ...it, fresh: false } : it)));
          }, 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="mono" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
            LIVE MATCH FEED
          </h1>
        </div>
        <LiveDot label="STREAMING" />
      </div>

      {items.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="kicker animate-pulse">WAITING FOR MATCH EVENTS...</p>
        </div>
      ) : (
        <div className="view-enter panel overflow-hidden">
          <div
            className="grid"
            style={{ gridTemplateColumns: GRID_COLS, padding: "11px 18px", borderBottom: "1px solid var(--border-soft)" }}
          >
            {COLUMNS.map((h) => (
              <span key={h} className="kicker">
                {h}
              </span>
            ))}
          </div>
          <div>
            {items.map((item) => (
              <div
                key={item.id}
                className="grid items-center"
                style={{
                  gridTemplateColumns: GRID_COLS,
                  padding: "12px 18px",
                  borderBottom: "1px solid var(--border-soft)",
                  background: item.fresh ? "var(--up-dim)" : "transparent",
                  transition: "background 1.2s ease",
                }}
              >
                <span className="mono" style={{ fontSize: 12.5, color: "var(--text)" }}>
                  {item.role_label ?? "ENGINEER"}
                </span>
                <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {item.salary != null ? formatSalary(item.salary) : "—"}
                </span>
                {item.delta_pct != null ? (
                  <span
                    className="mono tnum"
                    style={{ fontSize: 12, color: item.delta_pct >= 0 ? "var(--up)" : "var(--down)", fontWeight: 600 }}
                  >
                    {item.delta_pct >= 0 ? "▲ +" : "▼ "}
                    {Math.abs(item.delta_pct).toFixed(1)}%
                  </span>
                ) : (
                  <span className="mono tnum" style={{ fontSize: 12, color: "var(--up)", fontWeight: 600 }}>
                    ▲ MATCH
                  </span>
                )}
                <span className="mono tnum" style={{ fontSize: 11, color: "var(--dim)" }}>
                  {formatRelativeTime(item.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

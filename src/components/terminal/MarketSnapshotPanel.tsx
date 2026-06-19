"use client";

import { useEffect, useRef, useState } from "react";
import { formatSalary } from "@/lib/utils/formatters";
import { LiveDot } from "./LiveDot";
import { Delta } from "./Delta";
import { Sparkline } from "@/components/charts/Sparkline";
import type { MarketSnapshot } from "@/lib/market/snapshot";

const POLL_MS = 20000;
const FLASH_MS = 1100;

interface SnapshotRow {
  key: string;
  label: string;
  value: string;
  raw: number | null;
  delta: number | null;
}

function buildRows(s: MarketSnapshot): SnapshotRow[] {
  return [
    {
      key: "talentIndex",
      label: "TALENT INDEX",
      value:
        s.talentIndex != null
          ? s.talentIndex.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : "—",
      raw: s.talentIndex,
      delta: s.talentIndexDelta,
    },
    {
      key: "avgMatchSalary",
      label: "AVG MATCH SALARY",
      value: s.avgMatchSalary != null ? formatSalary(Math.round(s.avgMatchSalary)) : "—",
      raw: s.avgMatchSalary,
      delta: s.avgMatchSalaryDelta,
    },
    {
      key: "openPitches",
      label: "OPEN PITCHES",
      value: s.openPitches.toLocaleString("en-US"),
      raw: s.openPitches,
      delta: s.openPitchesDelta,
    },
    {
      key: "matchRate",
      label: "MATCH RATE 7D",
      value: s.matchRate != null ? `${s.matchRate.toFixed(0)}%` : "—",
      raw: s.matchRate,
      delta: s.matchRateDelta,
    },
  ];
}

export function MarketSnapshotPanel({ initial }: { initial: MarketSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});
  const prevRef = useRef(initial);

  useEffect(() => {
    const id = setInterval(async () => {
      // Skip the poll while the tab is backgrounded; the snapshot only matters
      // when someone is looking at it.
      if (document.hidden) return;
      try {
        const res = await fetch("/api/market-snapshot");
        if (!res.ok) return;
        const next: MarketSnapshot = await res.json();

        const prevRows = buildRows(prevRef.current);
        const nextRows = buildRows(next);
        const changes: Record<string, "up" | "down"> = {};
        for (const row of nextRows) {
          const prev = prevRows.find((r) => r.key === row.key);
          if (prev?.raw != null && row.raw != null && row.raw !== prev.raw) {
            changes[row.key] = row.raw > prev.raw ? "up" : "down";
          }
        }

        prevRef.current = next;
        setSnapshot(next);
        if (Object.keys(changes).length > 0) {
          setFlash(changes);
          setTimeout(() => setFlash({}), FLASH_MS);
        }
      } catch {
        // ignore transient errors; retry next interval
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const rows = buildRows(snapshot);
  const series = snapshot.talentIndexSeries;

  return (
    <div className="panel panel-accent no-num" style={{ overflow: "hidden" }}>
      <div className="panel-head">
        <span className="panel-title">MARKET SNAPSHOT</span>
        <LiveDot label="LIVE" />
      </div>
      <div>
        {rows.map((q, i) => (
          <div
            key={q.key}
            className={flash[q.key] === "up" ? "qf-up" : flash[q.key] === "down" ? "qf-down" : undefined}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              alignItems: "center",
              gap: 14,
              padding: "11px 16px",
              borderBottom: i < rows.length - 1 ? "1px solid var(--border-soft)" : "none",
            }}
          >
            <span className="kicker">{q.label}</span>
            <span className="mono tnum" style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              {q.value}
            </span>
            {q.delta != null ? (
              <Delta value={q.delta} suffix="%" />
            ) : (
              <span className="mono tnum" style={{ fontSize: 11.5, color: "var(--dim)" }}>
                —
              </span>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding: "14px 16px 16px" }}>
        <p className="kicker" style={{ margin: "0 0 10px" }}>
          INDEX · 30D
        </p>
        {series.length >= 2 ? (
          <div style={{ width: "100%", height: 100 }}>
            <Sparkline data={series} w={600} h={100} />
          </div>
        ) : (
          <p className="mono" style={{ fontSize: 11, color: "var(--dim)", margin: 0 }}>
            AWAITING 30D HISTORY
          </p>
        )}
      </div>
    </div>
  );
}

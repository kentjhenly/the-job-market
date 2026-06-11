"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

interface CalendarProps {
  value: string | null; // "YYYY-MM-DD"
  onChange: (date: string) => void;
  minDate?: Date;
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function Calendar({ value, onChange, minDate }: CalendarProps) {
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const [view, setView] = useState(() => {
    const base = selected ?? new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  function shift(months: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + months, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const startOffset = (new Date(view.year, view.month, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const min = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    : null;
  const today = new Date();

  const navBtn =
    "mono flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-surface-2";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-12)} aria-label="Previous year" className={navBtn} style={{ fontSize: 11, color: "var(--muted)" }}>
            «
          </button>
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className={navBtn} style={{ fontSize: 11, color: "var(--muted)" }}>
            ‹
          </button>
        </div>
        <span className="kicker" style={{ color: "var(--text)" }}>
          {MONTHS[view.month]} {view.year}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className={navBtn} style={{ fontSize: 11, color: "var(--muted)" }}>
            ›
          </button>
          <button type="button" onClick={() => shift(12)} aria-label="Next year" className={navBtn} style={{ fontSize: 11, color: "var(--muted)" }}>
            »
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="mono flex h-7 items-center justify-center"
            style={{ fontSize: 9, letterSpacing: "0.08em", color: "var(--dim)" }}
          >
            {d}
          </span>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(view.year, view.month, day);
          const disabled = min != null && date < min;
          const isSelected =
            selected != null &&
            selected.getFullYear() === view.year &&
            selected.getMonth() === view.month &&
            selected.getDate() === day;
          const isToday =
            today.getFullYear() === view.year &&
            today.getMonth() === view.month &&
            today.getDate() === day;

          return (
            <button
              type="button"
              key={day}
              disabled={disabled}
              onClick={() => onChange(toISO(view.year, view.month, day))}
              className={cn(
                "mono tnum flex h-7 items-center justify-center rounded transition-colors",
                !disabled && !isSelected && "hover:bg-surface-2",
                disabled && "cursor-not-allowed"
              )}
              style={{
                fontSize: 11,
                color: isSelected ? "var(--bg-deep)" : disabled ? "var(--dim)" : "var(--text)",
                background: isSelected ? "var(--up)" : undefined,
                border: isToday && !isSelected ? "1px solid var(--up-dim)" : undefined,
                opacity: disabled ? 0.35 : 1,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

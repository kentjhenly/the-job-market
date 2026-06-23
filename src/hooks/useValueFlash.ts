"use client";

import { useEffect, useRef, useState } from "react";

export interface FlashState {
  /** Direction of the most recent change, or null when settled. */
  dir: "up" | "down" | null;
  /** Signed magnitude of the most recent change (1 decimal). */
  delta: number;
}

/**
 * Detects when a numeric value changes between renders (e.g. a polled score)
 * and returns a transient up/down direction that auto-clears after `holdMs`,
 * the way a quote blinks on a trading terminal. Pair the `dir` with the
 * `.tick-up` / `.tick-down` flash classes and render `delta` as a brief tag.
 *
 * Motion is gated globally by prefers-reduced-motion (see globals.css); the
 * returned delta tag is informational and still appears.
 */
export function useValueFlash(value: number, holdMs = 600): FlashState {
  const prev = useRef(value);
  const [state, setState] = useState<FlashState>({ dir: null, delta: 0 });

  useEffect(() => {
    const previous = prev.current;
    if (value === previous) return;
    const dir = value > previous ? "up" : "down";
    prev.current = value;
    setState({ dir, delta: +(value - previous).toFixed(1) });
    const t = setTimeout(() => setState((s) => ({ ...s, dir: null })), holdMs);
    return () => clearTimeout(t);
  }, [value, holdMs]);

  return state;
}

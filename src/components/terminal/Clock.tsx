"use client";

import { useEffect, useState } from "react";

export function Clock() {
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    function tick() {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="mono tnum" style={{ fontSize: 12, color: "var(--text-2)" }}>
      {time} <span style={{ color: "var(--dim)" }}>SGT</span>
    </span>
  );
}

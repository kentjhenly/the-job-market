"use client";

import { useEffect } from "react";

/** Confirms the animation timeline is advancing before enabling slide-in
 * keyframes, so throttled/headless renders don't show frozen off-screen panels. */
export function AnimEnabler() {
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        document.documentElement.classList.add("anim-on");
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}

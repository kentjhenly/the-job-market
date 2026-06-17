"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

/** Slides content in from below while scrolled into view, and slides back out
 * (reversing the animation) once it leaves the viewport again — instead of
 * animating once on initial page load. */
export function ScrollReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0,
      rootMargin: "0px 0px -15% 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("scroll-reveal", visible && "in-view", className)}>
      {children}
    </div>
  );
}

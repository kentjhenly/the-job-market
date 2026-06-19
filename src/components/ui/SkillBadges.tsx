"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { Badge } from "./Badge";

interface SkillBadgesProps {
  skills: string[];
  variant?: "outline" | "muted";
}

export function SkillBadges({ skills, variant = "outline" }: SkillBadgesProps) {
  const [visibleCount, setVisibleCount] = useState(skills.length);
  const measureRef = useRef<HTMLDivElement>(null);

  const byLength = useMemo(
    () => [...skills].sort((a, b) => a.length - b.length || a.localeCompare(b)),
    [skills]
  );

  const recalc = useCallback(() => {
    const el = measureRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    if (children.length === 0) return;

    const firstTop = children[0].offsetTop;
    const lineHeight = children[0].offsetHeight;
    const maxTop = firstTop + lineHeight * 2;

    let count = children.length;
    for (let i = 0; i < children.length; i++) {
      if (children[i].offsetTop >= maxTop) {
        count = i;
        break;
      }
    }

    setVisibleCount(count < skills.length ? Math.max(count - 1, 1) : skills.length);
  }, [skills]);

  const containerCallback = useCallback(
    (node: HTMLDivElement | null) => {
      measureRef.current = node;
      if (!node) return;
      recalc();
      const ro = new ResizeObserver(recalc);
      ro.observe(node);
      return () => ro.disconnect();
    },
    [recalc]
  );

  const visible = useMemo(
    () => byLength.slice(0, visibleCount).sort((a, b) => a.localeCompare(b)),
    [byLength, visibleCount]
  );

  if (skills.length === 0) return null;

  const extra = skills.length - visibleCount;

  return (
    <div className="relative">
      <div
        ref={containerCallback}
        className="flex flex-wrap gap-1.5"
        aria-hidden
        style={{ position: "absolute", visibility: "hidden", left: 0, right: 0 }}
      >
        {byLength.map((skill) => (
          <Badge key={skill} variant={variant}>{skill}</Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((skill) => (
          <Badge key={skill} variant={variant}>{skill}</Badge>
        ))}
        {extra > 0 && <Badge variant={variant}>+{extra} MORE</Badge>}
      </div>
    </div>
  );
}

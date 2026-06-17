"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { SKILLS, type VerticalType } from "@/lib/utils/constants";

// Fuzzy rank: lower is better, null = no match. Direct substrings rank first
// (by position), then subsequence matches (query chars in order, gaps allowed).
function fuzzyRank(name: string, q: string): number | null {
  const lower = name.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx !== -1) return idx;
  let qi = 0;
  let firstIdx = -1;
  let lastIdx = -1;
  let gaps = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) {
      if (firstIdx === -1) firstIdx = i;
      if (lastIdx !== -1) gaps += i - lastIdx - 1;
      lastIdx = i;
      qi++;
    }
  }
  return qi === q.length ? 1000 + firstIdx + gaps : null;
}

interface SkillPickerProps {
  selected: string[];
  onToggle: (skill: string) => void;
  industry?: VerticalType | "";
  verifiedVerticals?: VerticalType[];
  max?: number;
}

export function SkillPicker({ selected, onToggle, industry, verifiedVerticals = [], max }: SkillPickerProps) {
  const [query, setQuery] = useState("");
  const atCap = max != null && selected.length >= max;

  function toggle(skill: string) {
    if (!selected.includes(skill) && atCap) return;
    onToggle(skill);
  }

  const suggested = industry
    ? SKILLS.filter((s) => s.vertical === industry).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const trimmed = query.trim().toLowerCase();
  const results = trimmed
    ? SKILLS.filter((s) => !selected.includes(s.name))
        .map((s) => ({ s, rank: fuzzyRank(s.name, trimmed) }))
        .filter((x): x is { s: (typeof SKILLS)[number]; rank: number } => x.rank != null)
        .sort((a, b) => a.rank - b.rank || a.s.name.localeCompare(b.s.name))
        .slice(0, 24)
        .map((x) => x.s)
    : [];

  return (
    <div className="space-y-4">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((skill) => (
            <Badge key={skill} variant="up">
              {skill}
              <button
                type="button"
                onClick={() => onToggle(skill)}
                aria-label={`Remove ${skill}`}
                style={{ marginLeft: 2 }}
              >
                ✕
              </button>
            </Badge>
          ))}
        </div>
      )}

      {industry && (
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="kicker">{industry.toUpperCase()}</span>
            {verifiedVerticals.includes(industry as VerticalType) && <Badge variant="up">✓ VERIFIED</Badge>}
          </div>
          <div className="flex flex-wrap gap-2">
            {suggested.map((skill) => {
              const isSelected = selected.includes(skill.name);
              return (
                <button
                  type="button"
                  key={skill.name}
                  onClick={() => toggle(skill.name)}
                  className={cn(
                    "badge",
                    isSelected ? "badge-up" : "badge-muted",
                    !isSelected && atCap && "cursor-not-allowed opacity-40"
                  )}
                >
                  {skill.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <label className="kicker mb-1.5 block">SEARCH ALL SKILLS</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="field"
        />
        {results.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {results.map((skill) => (
              <button
                type="button"
                key={skill.name}
                onClick={() => toggle(skill.name)}
                className={cn("badge badge-muted", atCap && "cursor-not-allowed opacity-40")}
              >
                {skill.name}
                <span style={{ opacity: 0.55 }}>{skill.vertical.toUpperCase()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

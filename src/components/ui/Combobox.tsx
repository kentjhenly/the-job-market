"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface ComboboxOption {
  value: string;
  group?: string;
}

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function Combobox({ value, onChange, options, placeholder, className, required }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = options.filter((o) => o.value.toLowerCase().includes(value.toLowerCase()));
  const groups = Array.from(new Set(filtered.map((o) => o.group ?? "")));

  function select(option: ComboboxOption) {
    onChange(option.value);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Enter" && filtered.length > 0) {
            e.preventDefault();
            select(filtered[0]);
          }
        }}
        placeholder={placeholder}
        className="field"
        autoComplete="off"
        required={required}
      />
      {open && filtered.length > 0 && (
        <div
          className="panel absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto"
          style={{ top: "100%" }}
        >
          {groups.map((group) => (
            <div key={group || "_"}>
              {group && (
                <div className="px-3 py-1.5" style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <span className="kicker">{group}</span>
                </div>
              )}
              {filtered
                .filter((o) => (o.group ?? "") === group)
                .map((o) => (
                  <button
                    type="button"
                    key={o.value}
                    onClick={() => select(o)}
                    className="block w-full px-3 py-2 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className="mono" style={{ fontSize: 12, color: "var(--text)" }}>
                      {o.value}
                    </span>
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

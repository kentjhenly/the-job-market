"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

export interface ComboboxOption {
  value: string;
  label?: string;
  group?: string;
}

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export function Combobox({ value, onChange, options, placeholder, className, required, disabled }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  // null = not searching (show the selected option's label); string = active search query
  const [query, setQuery] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const labelFor = (o: ComboboxOption) => o.label ?? o.value;
  const selected = options.find((o) => o.value === value);
  const display = query ?? (selected ? labelFor(selected) : "");

  const q = (query ?? "").trim().toLowerCase();
  const filtered = q === "" ? options : options.filter((o) => labelFor(o).toLowerCase().includes(q));
  const groups = Array.from(new Set(filtered.map((o) => o.group ?? "")));

  function select(option: ComboboxOption) {
    onChange(option.value);
    setQuery(null);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input
        ref={inputRef}
        value={display}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setQuery(null);
          } else if (e.key === "Enter" && filtered.length > 0) {
            e.preventDefault();
            select(filtered[0]);
          }
        }}
        placeholder={placeholder}
        className="field disabled:cursor-not-allowed disabled:opacity-50"
        style={{ textTransform: "uppercase", paddingRight: 28 }}
        autoComplete="off"
        required={required}
        disabled={disabled}
      />
      <span
        onMouseDown={(e) => {
          e.preventDefault();
          if (disabled) return;
          setOpen((o) => !o);
          inputRef.current?.focus();
        }}
        className="absolute top-1/2 -translate-y-1/2"
        style={{ right: 11, color: "var(--muted)", fontSize: 9, cursor: "pointer", pointerEvents: disabled ? "none" : "auto" }}
        aria-hidden
      >
        ▼
      </span>
      {open && !disabled && filtered.length > 0 && (
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
                    <span className="mono" style={{ fontSize: 12, color: "var(--text)", textTransform: "uppercase" }}>
                      {labelFor(o)}
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

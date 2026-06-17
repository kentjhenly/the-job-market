"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommandDef } from "@/lib/utils/commands";
import { useCommandConsole } from "./CommandConsoleContext";

export function CommandBar({ commands }: { commands: CommandDef[] }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { openHelp } = useCommandConsole();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? "";
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(tag)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const suggestions = focused && value
    ? commands.filter((c) => c.cmd.startsWith(value.toUpperCase()))
    : [];

  function run(raw: string) {
    const query = raw.trim().toUpperCase();
    if (!query) return;
    const cmd = commands.find((c) => c.cmd === query) ?? commands.find((c) => c.cmd.startsWith(query));
    if (cmd) {
      if (cmd.action === "help") openHelp();
      else if (cmd.href) router.push(cmd.href);
      setMessage({ ok: true, text: `${cmd.cmd} · ${cmd.desc.toUpperCase()}` });
      setValue("");
      inputRef.current?.blur();
    } else {
      setMessage({ ok: false, text: `UNKNOWN COMMAND — ${query}` });
    }
    setTimeout(() => setMessage(null), 2800);
  }

  return (
    <div className="cmdbar">
      <span className="mono" style={{ color: "var(--gold)", fontSize: 13, fontWeight: 700 }}>
        &gt;
      </span>
      <div className="relative flex flex-1 items-center">
        <input
          ref={inputRef}
          className="cmd-input"
          value={value}
          spellCheck={false}
          aria-label="Command line"
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 140)}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run(value);
            if (e.key === "Escape") {
              setValue("");
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        {!focused && !value && (
          <span className="pointer-events-none absolute left-0 inline-flex items-center gap-[9px]">
            <span className="cmd-blink" />
            <span className="mono" style={{ fontSize: 11, color: "var(--dim)", letterSpacing: "0.1em" }}>
              TYPE A COMMAND — {commands.map((c) => c.cmd).join(" · ")}
            </span>
          </span>
        )}
        {suggestions.length > 0 && (
          <div className="cmd-sug">
            {suggestions.map((c) => (
              <div
                key={c.cmd}
                className="cmd-sug-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  run(c.cmd);
                }}
              >
                <span className="mono" style={{ color: "var(--gold)", fontSize: 11.5, fontWeight: 700, width: 52, flexShrink: 0 }}>
                  {c.cmd}
                </span>
                <span className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>
                  {c.desc.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {message && (
        <span
          className="mono whitespace-nowrap"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.08em",
            color: message.ok ? "var(--up)" : "var(--down)",
            animation: "fadein .2s ease",
          }}
        >
          {message.ok ? "✓" : "✕"} {message.text}
        </span>
      )}
      <span className="mono whitespace-nowrap" style={{ fontSize: 10, color: "var(--dim)", letterSpacing: "0.1em" }}>
        / FOCUS · ENTER RUN
      </span>
    </div>
  );
}

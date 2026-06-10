"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/hooks/useSession";
import { formatRelativeTime } from "@/lib/utils/formatters";

interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface MatchChatProps {
  matchId: string;
  counterpartLabel: string;
}

const POLL_INTERVAL_MS = 5000;

export function MatchChat({ matchId, counterpartLabel }: MatchChatProps) {
  const { user } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/matches/${matchId}/messages`);
      if (!res.ok || cancelled) return;
      const { messages: data } = await res.json();
      setMessages(data);
      setLoaded(true);
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [matchId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    const res = await fetch(`/api/matches/${matchId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      const { message } = await res.json();
      setMessages((prev) => [...prev, message]);
      setDraft("");
    }
    setSending(false);
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">CHAT · {counterpartLabel}</span>
      </div>

      <div ref={scrollRef} className="space-y-2 overflow-y-auto p-4" style={{ maxHeight: 280 }}>
        {!loaded ? (
          <p className="kicker">LOADING MESSAGES…</p>
        ) : messages.length === 0 ? (
          <p className="kicker">NO MESSAGES YET. SAY HELLO.</p>
        ) : (
          messages.map((m) => {
            const own = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] rounded px-3 py-2"
                  style={{
                    background: own ? "var(--up-dim)" : "var(--surface-2)",
                    border: `1px solid ${
                      own ? "color-mix(in oklch, var(--up) 40%, transparent)" : "var(--border-soft)"
                    }`,
                  }}
                >
                  <p className="mono" style={{ fontSize: 12, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                    {m.body}
                  </p>
                  <p className="mono mt-1" style={{ fontSize: 10, color: "var(--muted)" }}>
                    {formatRelativeTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2 p-4" style={{ borderTop: "1px solid var(--border-soft)" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Message..."
          className="field flex-1"
        />
        <Button onClick={send} loading={sending} disabled={!draft.trim()} size="sm">
          SEND
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useSession } from "@/hooks/useSession";
import { formatRelativeTime, formatSalary, formatFileSize } from "@/lib/utils/formatters";
import { CHAT_GHOST_HOURS, MAX_CHAT_FILE_SIZE_MB } from "@/lib/utils/constants";
import type { MatchStatus, MessageType, OfferStatus } from "@/lib/supabase/types";

interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  message_type: MessageType;
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  created_at: string;
}

interface MatchInfo {
  id: string;
  employer_id: string;
  candidate_id: string;
  status: MatchStatus;
  offer_status: OfferStatus | null;
  offer_salary: number | null;
  offer_sent_at: string | null;
  hired_at: string | null;
  last_message_at: string | null;
}

interface MatchChatProps {
  matchId: string;
  counterpartLabel: string;
  counterpartSubLabel?: string;
  offeredSalary?: number | null;
}

const POLL_INTERVAL_MS = 5000;

type ConfirmStep = "none" | "review" | "final";

function parseOfferSalary(body: string): number | null {
  try {
    const parsed = JSON.parse(body);
    return typeof parsed.offered_salary === "number" ? parsed.offered_salary : null;
  } catch {
    return null;
  }
}

export function MatchChat({ matchId, counterpartLabel, counterpartSubLabel, offeredSalary }: MatchChatProps) {
  const { user } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Send-offer modal (employer)
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerSalaryInput, setOfferSalaryInput] = useState("");
  const [offerSending, setOfferSending] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  // Multi-step accept/decline confirm (candidate)
  const [confirmAction, setConfirmAction] = useState<"accept" | "decline" | null>(null);
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>("none");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmSending, setConfirmSending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Portfolio-accuracy rating (employer)
  const [portfolioFeedback, setPortfolioFeedback] = useState<{ rating: number } | null | undefined>(undefined);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/matches/${matchId}/messages`);
      if (!res.ok || cancelled) return;
      const { messages: data, match: matchData } = await res.json();
      setMessages(data);
      setMatch(matchData);
      setLoaded(true);
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [matchId]);

  // Mark this match as read by the current user as soon as the popup opens
  useEffect(() => {
    fetch(`/api/matches/${matchId}/read`, { method: "POST" });
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

  async function sendFile(file: File) {
    if (file.size > MAX_CHAT_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`FILE MUST BE UNDER ${MAX_CHAT_FILE_SIZE_MB}MB`);
      return;
    }
    setFileError(null);
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/matches/${matchId}/messages`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const { message } = await res.json();
      setMessages((prev) => [...prev, message]);
    } else {
      const json = await res.json().catch(() => ({}));
      setFileError(json.error ?? "FAILED TO UPLOAD FILE");
    }
    setUploading(false);
  }

  async function sendOffer() {
    const salary = Math.round(parseFloat(offerSalaryInput) * 100);
    if (!Number.isFinite(salary) || salary <= 0) {
      setOfferError("ENTER A VALID MONTHLY SALARY");
      return;
    }
    setOfferSending(true);
    setOfferError(null);
    const res = await fetch(`/api/matches/${matchId}/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", offered_salary: salary }),
    });
    if (res.ok) {
      const { message } = await res.json();
      setMessages((prev) => [...prev, message]);
      setMatch((prev) =>
        prev
          ? {
              ...prev,
              offer_status: "pending",
              offer_salary: salary,
              offer_sent_at: new Date().toISOString(),
            }
          : prev
      );
      setOfferModalOpen(false);
      setOfferSalaryInput("");
    } else {
      const json = await res.json().catch(() => ({}));
      setOfferError(json.error ?? "FAILED TO SEND OFFER");
    }
    setOfferSending(false);
  }

  function startConfirm(action: "accept" | "decline") {
    setConfirmAction(action);
    setConfirmStep("review");
    setConfirmChecked(false);
    setConfirmError(null);
  }

  function closeConfirm() {
    setConfirmAction(null);
    setConfirmStep("none");
    setConfirmChecked(false);
    setConfirmError(null);
  }

  async function submitConfirm() {
    if (!confirmAction) return;
    setConfirmSending(true);
    setConfirmError(null);
    const res = await fetch(`/api/matches/${matchId}/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: confirmAction }),
    });
    if (res.ok) {
      const { message, offer_status } = await res.json();
      setMessages((prev) => [...prev, message]);
      setMatch((prev) =>
        prev
          ? {
              ...prev,
              offer_status,
              hired_at: confirmAction === "accept" ? new Date().toISOString() : prev.hired_at,
            }
          : prev
      );
      closeConfirm();
    } else {
      const json = await res.json().catch(() => ({}));
      setConfirmError(json.error ?? "FAILED TO SUBMIT RESPONSE");
    }
    setConfirmSending(false);
  }

  const isEmployer = !!user && match?.employer_id === user.id;
  const isCandidate = !!user && match?.candidate_id === user.id;
  const isActive = match?.status === "accepted";
  const canSendOffer = isActive && isEmployer && !match?.hired_at && match?.offer_status !== "pending";
  const canRespondToOffer = isActive && isCandidate && match?.offer_status === "pending";

  useEffect(() => {
    if (!isEmployer || !isActive) return;
    let cancelled = false;
    fetch(`/api/matches/${matchId}/portfolio-feedback`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) setPortfolioFeedback(json.feedback);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId, isEmployer, isActive]);

  async function submitPortfolioFeedback(rating: number) {
    setFeedbackSubmitting(true);
    setFeedbackError(null);
    const res = await fetch(`/api/matches/${matchId}/portfolio-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    if (res.ok) {
      const { feedback } = await res.json();
      setPortfolioFeedback(feedback);
    } else {
      const json = await res.json().catch(() => ({}));
      setFeedbackError(json.error ?? "FAILED TO SUBMIT RATING");
    }
    setFeedbackSubmitting(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header strip */}
      <div
        className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--surface)" }}
      >
        <div className="min-w-0">
          <p className="mono truncate" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
            {counterpartLabel}
          </p>
          {counterpartSubLabel && (
            <p className="mono mt-0.5 truncate" style={{ fontSize: 10.5, color: "var(--muted)", letterSpacing: "0.04em" }}>
              {counterpartSubLabel}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {offeredSalary != null && (
            <span className="mono tnum" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
              PITCH {formatSalary(offeredSalary)}/MO
            </span>
          )}
          {match?.hired_at ? (
            <Badge variant="up">✓ HIRED</Badge>
          ) : match?.offer_status === "pending" ? (
            <Badge variant="gold">OFFER PENDING</Badge>
          ) : null}
        </div>
      </div>

      {/* Portfolio-accuracy rating (employer only) */}
      {isEmployer && isActive && portfolioFeedback !== undefined && (
        <div
          className="shrink-0 px-4 py-2.5"
          style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--surface)" }}
        >
          {portfolioFeedback ? (
            <p className="kicker c-muted">PORTFOLIO RATING SUBMITTED · {portfolioFeedback.rating}/5</p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="kicker c-muted">
                DID THE PORTFOLIO ACCURATELY REFLECT THIS CANDIDATE&apos;S ABILITY?
              </p>
              <div className="flex shrink-0 gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={feedbackSubmitting}
                    onClick={() => submitPortfolioFeedback(n)}
                    className="btn btn-ghost btn-sm"
                    style={{ minWidth: 28 }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          {feedbackError && <p className="kicker c-down mt-1">{feedbackError}</p>}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {!loaded ? (
          <p className="kicker">LOADING MESSAGES…</p>
        ) : messages.length === 0 ? (
          <p className="kicker">NO MESSAGES YET. SAY HELLO.</p>
        ) : (
          messages.map((m, idx) => {
            const own = m.sender_id === user?.id;
            const isLast = idx === messages.length - 1;

            if (m.message_type === "offer") {
              const salary = parseOfferSalary(m.body);
              const showActions = isLast && canRespondToOffer;
              return (
                <div key={m.id} className="flex justify-center">
                  <div
                    className="w-full max-w-[90%] rounded p-3 text-center"
                    style={{
                      background: "var(--gold-dim)",
                      border: "1px solid color-mix(in oklch, var(--gold) 40%, transparent)",
                    }}
                  >
                    <p className="kicker c-gold">HIRE OFFER</p>
                    <p className="mono tnum mt-1" style={{ fontSize: 18, color: "var(--text)" }}>
                      {salary != null ? `${formatSalary(salary)} / MO` : "—"}
                    </p>
                    <p className="mono mt-1" style={{ fontSize: 10, color: "var(--muted)" }}>
                      {own ? "YOU SENT THIS OFFER" : `${counterpartLabel} SENT THIS OFFER`} ·{" "}
                      {formatRelativeTime(m.created_at)}
                    </p>
                    {showActions && (
                      <div className="mt-3 flex justify-center gap-2">
                        <Button size="sm" variant="primary" onClick={() => startConfirm("accept")}>
                          ✓ ACCEPT OFFER
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => startConfirm("decline")}>
                          ✗ DECLINE OFFER
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            if (m.message_type === "offer_accepted" || m.message_type === "offer_declined") {
              const salary = parseOfferSalary(m.body);
              const accepted = m.message_type === "offer_accepted";
              return (
                <div key={m.id} className="flex justify-center">
                  <div
                    className="w-full max-w-[90%] rounded p-3 text-center"
                    style={{
                      background: accepted ? "var(--up-dim)" : "var(--down-dim)",
                      border: `1px solid color-mix(in oklch, var(${accepted ? "--up" : "--down"}) 40%, transparent)`,
                    }}
                  >
                    <p className={`kicker ${accepted ? "c-up" : "c-down"}`}>
                      {accepted ? "✓ OFFER ACCEPTED — HIRED" : "✗ OFFER DECLINED"}
                    </p>
                    {salary != null && (
                      <p className="mono tnum mt-1" style={{ fontSize: 14, color: "var(--text)" }}>
                        {formatSalary(salary)} / MO
                      </p>
                    )}
                    <p className="mono mt-1" style={{ fontSize: 10, color: "var(--muted)" }}>
                      {formatRelativeTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            }

            if (m.message_type === "file") {
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
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 16, lineHeight: 1 }}>📎</span>
                      <div className="min-w-0">
                        <p className="mono truncate" style={{ fontSize: 12, color: "var(--text)" }}>
                          {m.file_name ?? m.body}
                        </p>
                        {m.file_size != null && (
                          <p className="mono tnum" style={{ fontSize: 10, color: "var(--muted)" }}>
                            {formatFileSize(m.file_size)}
                          </p>
                        )}
                      </div>
                    </div>
                    <a
                      href={`/api/matches/${matchId}/messages/${m.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-up mono mt-1.5 inline-block"
                      style={{ fontSize: 10.5, letterSpacing: "0.08em" }}
                    >
                      DOWNLOAD →
                    </a>
                    <p className="mono mt-1" style={{ fontSize: 10, color: "var(--muted)" }}>
                      {formatRelativeTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            }

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

      {isActive ? (
        <>
          {canSendOffer && (
            <div className="px-4 pt-3" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <Button
                size="sm"
                variant="primary"
                className="w-full"
                onClick={() => setOfferModalOpen(true)}
              >
                SEND HIRE OFFER →
              </Button>
            </div>
          )}

          {match?.offer_status === "pending" && isEmployer && (
            <div className="px-4 pt-3" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <p className="kicker c-gold text-center">
                OFFER SENT · AWAITING {counterpartLabel.toUpperCase()}&apos;S RESPONSE
              </p>
            </div>
          )}

          <div
            className="flex shrink-0 items-center gap-2 p-4"
            style={canSendOffer || (match?.offer_status === "pending" && isEmployer) ? undefined : { borderTop: "1px solid var(--border-soft)" }}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) sendFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn btn-ghost btn-sm shrink-0"
              title="Attach file"
            >
              +
            </button>
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

          {(uploading || fileError) && (
            <p className={`kicker px-4 pb-2 ${fileError ? "c-down" : "c-muted"}`} style={{ fontSize: 10 }}>
              {fileError ?? "UPLOADING FILE…"}
            </p>
          )}

          <p className="kicker c-muted px-4 pb-3" style={{ fontSize: 9.5 }}>
            NO REPLY WITHIN {CHAT_GHOST_HOURS}H AUTO-DECLINES THIS MATCH AND COSTS REPUTATION
          </p>
        </>
      ) : (
        loaded &&
        match && (
          <div className="p-4" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <p className="kicker c-down text-center">
              THIS MATCH IS {match.status.toUpperCase()} · CHAT CLOSED
            </p>
          </div>
        )
      )}

      {/* Send offer modal */}
      <Modal open={offerModalOpen} onClose={() => setOfferModalOpen(false)} title="SEND HIRE OFFER">
        <div className="space-y-3">
          <p className="kicker c-muted">
            PROPOSE A FINAL MONTHLY SALARY TO {counterpartLabel.toUpperCase()}. THEY WILL BE ASKED TO
            ACCEPT OR DECLINE.
          </p>
          <div>
            <label className="kicker mb-1 block">MONTHLY SALARY (HKD)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={offerSalaryInput}
              onChange={(e) => setOfferSalaryInput(e.target.value)}
              placeholder="e.g. 35000"
              className="field w-full"
            />
          </div>
          {offerError && <p className="kicker c-down">{offerError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOfferModalOpen(false)}>
              CANCEL
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={offerSending}
              disabled={!offerSalaryInput.trim()}
              onClick={sendOffer}
            >
              SEND OFFER
            </Button>
          </div>
        </div>
      </Modal>

      {/* Multi-layer accept/decline confirm */}
      <Modal
        open={confirmStep !== "none"}
        onClose={closeConfirm}
        title={confirmAction === "accept" ? "CONFIRM ACCEPT OFFER" : "CONFIRM DECLINE OFFER"}
      >
        {confirmStep === "review" && (
          <div className="space-y-3">
            <p className="mono" style={{ fontSize: 13, color: "var(--text)" }}>
              {confirmAction === "accept"
                ? `You're about to ACCEPT this hire offer${
                    match?.offer_salary ? ` of ${formatSalary(match.offer_salary)}/mo` : ""
                  } from ${counterpartLabel}.`
                : `You're about to DECLINE this hire offer${
                    match?.offer_salary ? ` of ${formatSalary(match.offer_salary)}/mo` : ""
                  } from ${counterpartLabel}.`}
            </p>
            <p className="kicker c-muted">
              {confirmAction === "accept"
                ? "ACCEPTING WILL MARK YOU AS HIRED FOR THIS MATCH."
                : "DECLINING ENDS THIS MATCH — IT CANNOT BE RE-PITCHED."}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeConfirm}>
                CANCEL
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmStep("final")}>
                CONTINUE →
              </Button>
            </div>
          </div>
        )}

        {confirmStep === "final" && (
          <div className="space-y-3">
            <p
              className="kicker"
              style={{ color: confirmAction === "accept" ? "var(--up)" : "var(--down)" }}
            >
              FINAL STEP — THIS CANNOT BE UNDONE
            </p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                className="mt-1"
              />
              <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                I understand this {confirmAction === "accept" ? "accepts" : "declines"} the offer
                {match?.offer_salary ? ` of ${formatSalary(match.offer_salary)}/mo` : ""} and cannot
                be changed afterwards.
              </span>
            </label>
            {confirmError && <p className="kicker c-down">{confirmError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmStep("review")}>
                ← BACK
              </Button>
              <Button
                variant={confirmAction === "accept" ? "primary" : "danger"}
                size="sm"
                disabled={!confirmChecked}
                loading={confirmSending}
                onClick={submitConfirm}
              >
                {confirmAction === "accept" ? "CONFIRM ACCEPT" : "CONFIRM DECLINE"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

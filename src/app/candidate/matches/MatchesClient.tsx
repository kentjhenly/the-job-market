"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataRow } from "@/components/terminal/DataRow";
import { formatSalary, formatRelativeTime } from "@/lib/utils/formatters";
import { MatchChat } from "@/components/terminal/MatchChat";
import type { OfferStatus } from "@/lib/supabase/types";

interface Match {
  id: string;
  status: string;
  pitch_message: string | null;
  offered_salary: number | null;
  offer_status: OfferStatus | null;
  offer_salary: number | null;
  hired_at: string | null;
  expires_at: string;
  created_at: string;
  last_message_at: string | null;
  candidate_last_read_at: string | null;
  employers?: {
    company_name: string;
    reputation_score: number;
    company_size?: string | null;
    industry?: string | null;
    website?: string | null;
    headquarters?: string | null;
    description?: string | null;
    verified?: boolean;
    profiles?: { display_name: string; email: string } | null;
  } | null;
}

function normalizeUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

type ConfirmStep = "none" | "review" | "final";

const statusVariant: Record<string, "up" | "down" | "gold" | "muted"> = {
  accepted: "up",
  declined: "down",
  ghosted: "down",
  expired: "muted",
  pending: "gold",
};

const COLUMNS = "1fr 8rem 12rem 5rem 6rem 8rem";
const HEADERS = ["EMPLOYER", "OFFERED", "SENT", "OFFER", "", "STATUS"];
const FILTERS = ["all", "pending", "accepted", "declined", "ghosted"] as const;

function isUnread(m: Match) {
  return (
    !m.candidate_last_read_at ||
    new Date(m.last_message_at ?? m.created_at) > new Date(m.candidate_last_read_at)
  );
}

function expiryCountdown(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "SOON";
  const hours = Math.floor(ms / 3600000);
  return hours < 1 ? "< 1H" : `${hours}H`;
}

function StatusPill({ status }: { status: string }) {
  const col =
    status === "accepted" ? "var(--up)"
    : status === "declined" || status === "ghosted" ? "var(--down)"
    : status === "pending" ? "var(--gold)"
    : "var(--muted)";
  return (
    <div
      style={{
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `1px solid ${col}`,
        background: `color-mix(in oklch, ${col} 12%, transparent)`,
        borderRadius: 9999,
      }}
    >
      <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: col, letterSpacing: "0.1em" }}>
        {status.toUpperCase()}
      </span>
    </div>
  );
}

interface MatchesClientProps {
  matches: Match[];
}

export function MatchesClient({ matches: initial }: MatchesClientProps) {
  const [matches, setMatches] = useState<Match[]>(initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatMatchId, setChatMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [offerConfirm, setOfferConfirm] = useState<{ matchId: string; action: "accept" | "decline" } | null>(null);
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>("none");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmSending, setConfirmSending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const filtered = filter === "all" ? matches : matches.filter((m) => m.status === filter);
  const selected = matches.find((m) => m.id === selectedId) ?? null;
  const chatMatch = matches.find((m) => m.id === chatMatchId) ?? null;
  const confirmMatch = matches.find((m) => m.id === offerConfirm?.matchId) ?? null;

  async function respond(matchId: string, action: "accept" | "decline") {
    setLoading((prev) => ({ ...prev, [matchId]: true }));
    setErrors((prev) => ({ ...prev, [matchId]: "" }));
    const res = await fetch(`/api/matches/${matchId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const { status } = await res.json();
      setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, status } : m)));
    } else {
      const json = await res.json().catch(() => ({}));
      setErrors((prev) => ({ ...prev, [matchId]: json.error ?? "FAILED TO RESPOND" }));
    }
    setLoading((prev) => ({ ...prev, [matchId]: false }));
  }

  function markRead(m: Match) {
    const now = new Date().toISOString();
    setMatches((prev) => prev.map((mm) => (mm.id === m.id ? { ...mm, candidate_last_read_at: now } : mm)));
    fetch(`/api/matches/${m.id}/read`, { method: "POST" });
  }

  function openRow(m: Match) {
    setSelectedId(m.id);
    setChatMatchId(null);
    markRead(m);
  }

  function openChat(m: Match) {
    setChatMatchId(m.id);
    setSelectedId(null);
    markRead(m);
  }

  function startOfferConfirm(m: Match, action: "accept" | "decline") {
    setOfferConfirm({ matchId: m.id, action });
    setConfirmStep("review");
    setConfirmChecked(false);
    setConfirmError(null);
  }

  function closeOfferConfirm() {
    setOfferConfirm(null);
    setConfirmStep("none");
    setConfirmChecked(false);
    setConfirmError(null);
  }

  async function submitOfferConfirm() {
    if (!offerConfirm) return;
    setConfirmSending(true);
    setConfirmError(null);
    const res = await fetch(`/api/matches/${offerConfirm.matchId}/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: offerConfirm.action }),
    });
    if (res.ok) {
      const { offer_status } = await res.json();
      setMatches((prev) =>
        prev.map((mm) =>
          mm.id === offerConfirm.matchId
            ? { ...mm, offer_status, hired_at: offerConfirm.action === "accept" ? new Date().toISOString() : mm.hired_at }
            : mm
        )
      );
      closeOfferConfirm();
    } else {
      const json = await res.json().catch(() => ({}));
      setConfirmError(json.error ?? "FAILED TO SUBMIT RESPONSE");
    }
    setConfirmSending(false);
  }

  return (
    <div className="view-enter space-y-4">
      {/* Header */}
      <div>
        <h1 className="mono" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
          PITCHES
        </h1>
      </div>

      {/* Filter tabs */}
      <div className="tabbar">
        {FILTERS.map((f) => (
          <span key={f} className={`tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f.toUpperCase()}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="panel overflow-hidden" style={{ borderTop: "2px solid var(--gold)" }}>
        <div
          className="grid gap-4 px-4 py-2.5"
          style={{ gridTemplateColumns: COLUMNS, borderBottom: "1px solid var(--border-soft)" }}
        >
          {HEADERS.map((h) => (
            <span key={h} className="kicker">
              {h}
            </span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="kicker">
              {filter === "all"
                ? "NO PITCHES YET. IMPROVE YOUR SKILL SCORE TO ATTRACT EMPLOYERS."
                : `NO ${filter.toUpperCase()} PITCHES.`}
            </p>
          </div>
        ) : (
          filtered.map((m, idx) => {
            const sel = m.id === selectedId;
            const unread = isUnread(m);
            const secondLine = [m.employers?.industry, m.employers?.company_size].filter(Boolean).join(" · ");
            return (
              <div
                key={m.id}
                onClick={() => openRow(m)}
                className="grid cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
                style={{
                  gridTemplateColumns: COLUMNS,
                  borderBottom: idx === filtered.length - 1 ? "none" : "1px solid var(--border-soft)",
                  background: sel ? "var(--surface-2)" : unread ? "color-mix(in oklch, var(--up) 4%, transparent)" : "transparent",
                }}
              >
                {/* EMPLOYER — 2-line */}
                <div className="min-w-0">
                  <p className="mono truncate" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {m.employers?.company_name ?? "UNKNOWN COMPANY"}
                  </p>
                  {secondLine && (
                    <p className="mono truncate" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      {secondLine}
                    </p>
                  )}
                </div>

                {/* OFFERED */}
                <span
                  className="mono tnum"
                  style={{ fontSize: 12, fontWeight: 600, color: m.offered_salary ? "var(--up)" : "var(--muted)" }}
                >
                  {m.offered_salary ? formatSalary(m.offered_salary) : "—"}
                </span>

                {/* SENT + expiry countdown */}
                <span className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>
                  {formatRelativeTime(m.created_at)}
                  {m.status === "pending" && (
                    <span style={{ color: "var(--gold)" }}>{` · in ${expiryCountdown(m.expires_at)}`}</span>
                  )}
                </span>

                {/* offer buttons */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {m.status === "accepted" && m.offer_status === "pending" && (
                    <>
                      <button
                        onClick={() => startOfferConfirm(m, "accept")}
                        title="Accept hire offer"
                        className="mono"
                        style={{
                          background: "transparent",
                          border: "1px solid color-mix(in oklch, var(--up) 55%, transparent)",
                          color: "var(--up)",
                          padding: "2px 8px",
                          fontSize: 12,
                          borderRadius: "var(--r)",
                          cursor: "pointer",
                          lineHeight: 1.6,
                        }}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => startOfferConfirm(m, "decline")}
                        title="Decline hire offer"
                        className="btn btn-danger-solid mono"
                        style={{ padding: "2px 8px", fontSize: 12, lineHeight: 1.6 }}
                      >
                        ✗
                      </button>
                    </>
                  )}
                </div>

                {/* CHAT button — green */}
                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                  {m.status === "accepted" && (
                    <button
                      onClick={() => openChat(m)}
                      className="btn btn-sm"
                      style={{ fontSize: 10.5, whiteSpace: "nowrap", background: "color-mix(in oklch, var(--up) 15%, transparent)", color: "var(--up)", border: "1px solid color-mix(in oklch, var(--up) 40%, transparent)" }}
                    >
                      CHAT →
                    </button>
                  )}
                </div>

                {/* STATUS — full-width pill */}
                <StatusPill status={m.status} />
              </div>
            );
          })
        )}
      </div>

      {/* pitch detail slide-over */}
      {selected && (
        <div
          className="slideover-panel flex flex-col"
          style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
        >
          <div className="panel-head">
            <span className="panel-title">PITCH DETAIL</span>
            <button onClick={() => setSelectedId(null)} className="btn btn-ghost btn-sm">
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-auto p-4">
            <div className="flex items-center justify-between">
              <span className="mono" style={{ fontSize: 16, color: "var(--text)", fontWeight: 600 }}>
                {selected.employers?.company_name ?? "UNKNOWN COMPANY"}
              </span>
              <Badge variant={statusVariant[selected.status] ?? "muted"}>{selected.status.toUpperCase()}</Badge>
            </div>

            <div>
              {selected.employers?.reputation_score != null && (
                <DataRow
                  label="REPUTATION"
                  value={selected.employers.reputation_score.toFixed(0)}
                  color={
                    selected.employers.reputation_score >= 80
                      ? "up"
                      : selected.employers.reputation_score >= 50
                        ? "gold"
                        : "down"
                  }
                />
              )}
              {selected.offered_salary != null && (
                <DataRow label="OFFERED SALARY" value={formatSalary(selected.offered_salary)} color="up" />
              )}
              <DataRow label="SENT" value={formatRelativeTime(selected.created_at)} />
              {selected.status === "pending" && (
                <DataRow label="EXPIRES" value={formatRelativeTime(selected.expires_at)} color="gold" />
              )}
            </div>

            {/* hire offer pending — surface prominently in slide-over */}
            {selected.status === "accepted" && selected.offer_status === "pending" && (
              <div
                style={{
                  border: "1px solid color-mix(in oklch, var(--gold) 35%, transparent)",
                  background: "var(--gold-dim)",
                  borderRadius: "var(--r)",
                  padding: "12px 14px",
                }}
              >
                <p className="kicker" style={{ color: "var(--gold)" }}>
                  HIRE OFFER PENDING
                </p>
                {selected.offer_salary && (
                  <p className="mono tnum" style={{ fontSize: 15, color: "var(--gold)", fontWeight: 700, marginTop: 4 }}>
                    {formatSalary(selected.offer_salary)}/mo
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => startOfferConfirm(selected, "accept")} className="flex-1">
                    ACCEPT OFFER
                  </Button>
                  <Button variant="danger" onClick={() => startOfferConfirm(selected, "decline")} className="flex-1">
                    DECLINE
                  </Button>
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="kicker">VERIFY EMPLOYER</span>
                {selected.employers?.verified ? (
                  <Badge variant="up">VERIFIED</Badge>
                ) : (
                  <Badge variant="muted">UNVERIFIED</Badge>
                )}
              </div>
              <DataRow label="COMPANY" value={selected.employers?.company_name ?? "—"} />
              <DataRow label="CONTACT" value={selected.employers?.profiles?.display_name ?? "—"} />
              <DataRow label="EMAIL" value={selected.employers?.profiles?.email ?? "—"} />
              <DataRow label="INDUSTRY" value={selected.employers?.industry ?? "—"} />
              <DataRow label="COMPANY SIZE" value={selected.employers?.company_size ?? "—"} />
              <DataRow label="HEADQUARTERS" value={selected.employers?.headquarters ?? "—"} />
              <DataRow
                label="WEBSITE"
                value={
                  selected.employers?.website ? (
                    <a
                      href={normalizeUrl(selected.employers.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-up"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {selected.employers.website}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              {selected.employers?.description && (
                <div className="pt-3">
                  <p className="kicker mb-1">ABOUT</p>
                  <p className="mono" style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
                    {selected.employers.description}
                  </p>
                </div>
              )}
            </div>

            {selected.pitch_message && (
              <div>
                <p className="kicker mb-2">PITCH MESSAGE</p>
                <p className="mono" style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
                  {selected.pitch_message}
                </p>
              </div>
            )}

            {selected.status === "accepted" && (
              <Button variant="primary" className="w-full" onClick={() => openChat(selected)}>
                OPEN CHAT →
              </Button>
            )}
          </div>

          {selected.status === "pending" && (
            <div className="space-y-2 p-4" style={{ borderTop: "1px solid var(--border)" }}>
              {errors[selected.id] && (
                <p className="kicker c-down" style={{ fontSize: 11 }}>
                  {errors[selected.id]}
                </p>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => respond(selected.id, "accept")}
                  loading={loading[selected.id]}
                  className="flex-1"
                >
                  ACCEPT MATCH
                </Button>
                <Button
                  variant="danger"
                  onClick={() => respond(selected.id, "decline")}
                  loading={loading[selected.id]}
                  className="flex-1"
                >
                  DECLINE
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* chat slide-over */}
      {chatMatch && (
        <div
          className="slideover-panel flex flex-col"
          style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
        >
          <div className="panel-head">
            <span className="panel-title">CHAT</span>
            <button onClick={() => setChatMatchId(null)} className="btn btn-ghost btn-sm">
              ✕
            </button>
          </div>
          <MatchChat
            matchId={chatMatch.id}
            counterpartLabel={chatMatch.employers?.company_name ?? "UNKNOWN COMPANY"}
            counterpartSubLabel={
              chatMatch.employers?.reputation_score != null
                ? `REPUTATION ${chatMatch.employers.reputation_score.toFixed(0)}/100`
                : undefined
            }
            offeredSalary={chatMatch.offered_salary}
          />
        </div>
      )}

      {/* hire offer confirm modal */}
      <Modal
        open={confirmStep !== "none"}
        onClose={closeOfferConfirm}
        title={offerConfirm?.action === "accept" ? "CONFIRM ACCEPT OFFER" : "CONFIRM DECLINE OFFER"}
      >
        {confirmStep === "review" && (
          <div className="space-y-3">
            <p className="mono" style={{ fontSize: 13, color: "var(--text)" }}>
              {offerConfirm?.action === "accept"
                ? `You're about to ACCEPT this hire offer${
                    confirmMatch?.offer_salary ? ` of ${formatSalary(confirmMatch.offer_salary)}/mo` : ""
                  } from ${confirmMatch?.employers?.company_name ?? "this employer"}.`
                : `You're about to DECLINE this hire offer${
                    confirmMatch?.offer_salary ? ` of ${formatSalary(confirmMatch.offer_salary)}/mo` : ""
                  } from ${confirmMatch?.employers?.company_name ?? "this employer"}.`}
            </p>
            <p className="kicker c-muted">
              {offerConfirm?.action === "accept"
                ? "ACCEPTING WILL MARK YOU AS HIRED FOR THIS MATCH."
                : "DECLINING ENDS THIS MATCH. IT CANNOT BE RE-PITCHED."}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeOfferConfirm}>
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
            <p className="kicker" style={{ color: offerConfirm?.action === "accept" ? "var(--up)" : "var(--down)" }}>
              FINAL STEP. THIS CANNOT BE UNDONE
            </p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                className="mt-1"
              />
              <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                I understand this {offerConfirm?.action === "accept" ? "accepts" : "declines"} the offer
                {confirmMatch?.offer_salary ? ` of ${formatSalary(confirmMatch.offer_salary)}/mo` : ""} and cannot be
                changed afterwards.
              </span>
            </label>
            {confirmError && <p className="kicker c-down">{confirmError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmStep("review")}>
                ← BACK
              </Button>
              <Button
                variant={offerConfirm?.action === "accept" ? "primary" : "danger"}
                size="sm"
                disabled={!confirmChecked}
                loading={confirmSending}
                onClick={submitOfferConfirm}
              >
                {offerConfirm?.action === "accept" ? "CONFIRM ACCEPT" : "CONFIRM DECLINE"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

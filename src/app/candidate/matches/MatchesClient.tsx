"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataRow } from "@/components/terminal/DataRow";
import { formatSalary, formatRelativeTime } from "@/lib/utils/formatters";
import { repBadgeVariant } from "@/lib/utils/score";
import { MatchChat } from "@/components/terminal/MatchChat";
import { CheckIcon, CrossIcon } from "@/components/ui/Glyph";
import { useIsMobile } from "@/hooks/useIsMobile";
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
  const candidate = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  // Defense-in-depth: only ever emit an http(s) href so a malformed/hostile
  // stored value can't become a javascript:/data: link.
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return candidate;
  } catch {
    // fall through
  }
  return "#";
}

type ConfirmStep = "none" | "review" | "final";

const statusVariant: Record<string, "up" | "down" | "gold" | "muted"> = {
  accepted: "up",
  declined: "down",
  ghosted: "down",
  withdrawn: "down",
  expired: "muted",
  pending: "gold",
};

const COLUMNS = "1.2rem 1fr 6rem 6rem 7.5rem 7.5rem 5.5rem";
const HEADERS = ["", "EMPLOYER", "OFFERED", "SENT", "MATCH", "OFFER STATUS", ""];
const FILTERS = ["all", "pending", "accepted", "declined", "ghosted", "withdrawn"] as const;

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

function OfferStatusBadge({ match }: { match: Match }) {
  if (match.hired_at) return <Badge variant="up">ACCEPTED</Badge>;
  if (match.status === "accepted" && match.offer_status === "pending") return <Badge variant="gold">OFFER PENDING</Badge>;
  if (match.status === "accepted") return <Badge variant="muted">IN DISCUSSION</Badge>;
  if (match.status === "pending") return <Badge variant="muted">PENDING</Badge>;
  if (match.status === "declined" && match.offer_salary != null && !match.hired_at) return <Badge variant="down">RENEGED</Badge>;
  if (match.status === "declined") return <Badge variant="down">DECLINED</Badge>;
  if (match.status === "ghosted") return <Badge variant="down">GHOSTED</Badge>;
  if (match.status === "withdrawn") return <Badge variant="down">WITHDRAWN</Badge>;
  return <Badge variant="muted">{match.status.toUpperCase()}</Badge>;
}

interface MatchesClientProps {
  matches: Match[];
}

export function MatchesClient({ matches: initial }: MatchesClientProps) {
  const router = useRouter();
  const mobile = useIsMobile();
  const [matches, setMatches] = useState<Match[]>(initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatMatchId, setChatMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pitchConfirm, setPitchConfirm] = useState<{ matchId: string; action: "accept" | "decline" } | null>(null);
  const [pitchConfirmStep, setPitchConfirmStep] = useState<ConfirmStep>("none");
  const [pitchConfirmChecked, setPitchConfirmChecked] = useState(false);
  const [pitchConfirmSending, setPitchConfirmSending] = useState(false);
  const [pitchConfirmError, setPitchConfirmError] = useState<string | null>(null);
  const [offerConfirm, setOfferConfirm] = useState<{ matchId: string; action: "accept" | "decline" } | null>(null);
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>("none");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmSending, setConfirmSending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [renegeMatchId, setRenegeMatchId] = useState<string | null>(null);
  const [renegeStep, setRenegeStep] = useState<ConfirmStep>("none");
  const [renegeChecked, setRenegeChecked] = useState(false);
  const [renegeSending, setRenegeSending] = useState(false);
  const [renegeError, setRenegeError] = useState<string | null>(null);

  const matchRank: Record<string, number> = { pending: 0, accepted: 1, declined: 2, ghosted: 3, withdrawn: 4 };
  function offerRank(m: Match): number {
    if (m.status === "accepted" && m.offer_status === "pending") return 0;
    if (m.hired_at) return 1;
    if (m.status === "accepted") return 2;
    if (m.status === "declined") return 3;
    if (m.status === "ghosted") return 4;
    if (m.status === "withdrawn") return 5;
    return 6;
  }
  const sorted = [...matches].sort((a, b) => (matchRank[a.status] ?? 9) - (matchRank[b.status] ?? 9) || offerRank(a) - offerRank(b));
  const filtered = filter === "all" ? sorted : sorted.filter((m) => m.status === filter);
  const selected = matches.find((m) => m.id === selectedId) ?? null;
  const chatMatch = matches.find((m) => m.id === chatMatchId) ?? null;
  const pitchConfirmMatch = matches.find((m) => m.id === pitchConfirm?.matchId) ?? null;
  const confirmMatch = matches.find((m) => m.id === offerConfirm?.matchId) ?? null;

  function startPitchConfirm(m: Match, action: "accept" | "decline") {
    setPitchConfirm({ matchId: m.id, action });
    setPitchConfirmStep("review");
    setPitchConfirmChecked(false);
    setPitchConfirmError(null);
  }

  function closePitchConfirm() {
    setPitchConfirm(null);
    setPitchConfirmStep("none");
    setPitchConfirmChecked(false);
    setPitchConfirmError(null);
  }

  async function submitPitchConfirm() {
    if (!pitchConfirm) return;
    setPitchConfirmSending(true);
    setPitchConfirmError(null);
    const res = await fetch(`/api/matches/${pitchConfirm.matchId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: pitchConfirm.action }),
    });
    if (res.ok) {
      const { status } = await res.json();
      setMatches((prev) => prev.map((m) => (m.id === pitchConfirm.matchId ? { ...m, status } : m)));
      closePitchConfirm();
    } else {
      const json = await res.json().catch(() => ({}));
      setPitchConfirmError(json.error ?? "FAILED TO RESPOND");
    }
    setPitchConfirmSending(false);
  }

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

  function startRenege(m: Match) {
    setRenegeMatchId(m.id);
    setRenegeStep("review");
    setRenegeChecked(false);
    setRenegeError(null);
  }

  function closeRenege() {
    setRenegeMatchId(null);
    setRenegeStep("none");
    setRenegeChecked(false);
    setRenegeError(null);
  }

  async function submitRenege() {
    if (!renegeMatchId) return;
    setRenegeSending(true);
    setRenegeError(null);
    const res = await fetch(`/api/matches/${renegeMatchId}/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "renege" }),
    });
    if (res.ok) {
      setMatches((prev) =>
        prev.map((m) =>
          m.id === renegeMatchId ? { ...m, status: "declined", offer_status: "declined", hired_at: null } : m
        )
      );
      closeRenege();
    } else {
      const json = await res.json().catch(() => ({}));
      setRenegeError(json.error ?? "FAILED TO RENEGE");
    }
    setRenegeSending(false);
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
        {!mobile && (
          <div
            className="grid gap-4 px-4 py-2.5"
            style={{ gridTemplateColumns: COLUMNS, borderBottom: "1px solid var(--border-soft)" }}
          >
            {HEADERS.map((h, i) => (
              <span key={i} className="kicker">
                {h}
              </span>
            ))}
          </div>
        )}

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

            if (mobile) {
              return (
                <div
                  key={m.id}
                  onClick={() => openRow(m)}
                  className="cursor-pointer px-4 py-3 transition-colors hover:bg-surface-2"
                  style={{
                    borderBottom: idx === filtered.length - 1 ? "none" : "1px solid var(--border-soft)",
                    background: sel ? "var(--surface-2)" : unread ? "color-mix(in oklch, var(--up) 4%, transparent)" : "transparent",
                    minHeight: 56,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {unread && <span className="live-dot shrink-0" />}
                        <p className="mono truncate" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                          {m.employers?.company_name ?? "UNKNOWN COMPANY"}
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {m.offered_salary && (
                          <span className="mono tnum" style={{ fontSize: 11, fontWeight: 600, color: "var(--up)" }}>
                            {formatSalary(m.offered_salary)}
                          </span>
                        )}
                        <span className="mono tnum" style={{ fontSize: 10.5, color: "var(--muted)" }}>
                          {formatRelativeTime(m.created_at)}
                          {m.status === "pending" && (
                            <span style={{ color: "var(--gold)" }}>{` · ${expiryCountdown(m.expires_at)}`}</span>
                          )}
                        </span>
                        {secondLine && (
                          <span className="mono" style={{ fontSize: 10.5, color: "var(--dim)" }}>
                            {secondLine}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <OfferStatusBadge match={m} />
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {m.status === "pending" && (
                          <>
                            <button
                              onClick={() => startPitchConfirm(m, "accept")}
                              title="Accept"
                              className="btn btn-primary"
                              style={{ width: 44, height: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                            >
                              <CheckIcon size={14} />
                            </button>
                            <button
                              onClick={() => startPitchConfirm(m, "decline")}
                              title="Decline"
                              className="btn btn-danger-solid"
                              style={{ width: 44, height: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                            >
                              <CrossIcon size={12} />
                            </button>
                          </>
                        )}
                        {m.status === "accepted" && (
                          <button
                            onClick={() => openChat(m)}
                            className="btn btn-sm"
                            style={{ fontSize: 10.5, whiteSpace: "nowrap", minHeight: 44, background: "color-mix(in oklch, var(--up) 15%, transparent)", color: "var(--up)", border: "1px solid color-mix(in oklch, var(--up) 40%, transparent)" }}
                          >
                            CHAT →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

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
                {/* Unread dot */}
                <div className="flex items-center justify-center">
                  {unread && <span className="live-dot" />}
                </div>

                {/* EMPLOYER -- 2-line */}
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

                {/* MATCH column */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {m.status === "pending" && (
                    <>
                      <button
                        onClick={() => startPitchConfirm(m, "accept")}
                        title="Accept match and open chat"
                        className="btn btn-primary"
                        style={{ width: 30, height: 30, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                      >
                        <CheckIcon size={12} />
                      </button>
                      <button
                        onClick={() => startPitchConfirm(m, "decline")}
                        title="Decline match"
                        className="btn btn-danger-solid"
                        style={{ width: 30, height: 30, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                      >
                        <CrossIcon size={10} />
                      </button>
                    </>
                  )}
                  {(m.status === "accepted" || (m.status === "declined" && m.offer_salary != null && !m.hired_at)) && (
                    <Badge variant="up" style={{ minWidth: 110 }}>MATCHED</Badge>
                  )}
                  {(m.status === "ghosted" || m.status === "withdrawn" || (m.status === "declined" && (m.offer_salary == null || !!m.hired_at))) && (
                    <Badge variant="down" style={{ minWidth: 110 }}>UNMATCHED</Badge>
                  )}
                </div>

                {/* OFFER STATUS */}
                <OfferStatusBadge match={m} />

                {/* CHAT button -- green */}
                <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
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
            <button onClick={() => setSelectedId(null)} className="btn btn-ghost btn-sm" aria-label="Close">
              <CrossIcon size={11} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-auto p-4">
            <div className="flex items-center justify-between">
              <span className="mono" style={{ fontSize: 16, color: "var(--text)", fontWeight: 600 }}>
                {selected.employers?.company_name ?? "UNKNOWN COMPANY"}
              </span>
              <Badge variant={statusVariant[selected.status] ?? "muted"}>
                {selected.status === "declined" && selected.offer_salary != null && !selected.hired_at
                  ? "RENEGED"
                  : selected.status.toUpperCase()}
              </Badge>
            </div>

            <div>
              {selected.employers?.reputation_score != null && (
                <DataRow
                  label="REPUTATION"
                  value={selected.employers.reputation_score.toFixed(0)}
                  color={repBadgeVariant(selected.employers.reputation_score)}
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

            {selected.status === "accepted" && (
              <div className="space-y-2">
                <Button variant="primary" className="w-full" onClick={() => openChat(selected)}>
                  OPEN CHAT →
                </Button>
                {selected.hired_at && (
                  <Button variant="danger" className="w-full" onClick={() => startRenege(selected)}>
                    RENEGE OFFER
                  </Button>
                )}
              </div>
            )}
          </div>

          {selected.status === "pending" && (
            <div className="space-y-2 p-4" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex gap-3">
                <Button
                  onClick={() => startPitchConfirm(selected, "accept")}
                  className="flex-1"
                >
                  ACCEPT MATCH
                </Button>
                <Button
                  variant="danger"
                  onClick={() => startPitchConfirm(selected, "decline")}
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
            <button onClick={() => { setChatMatchId(null); router.refresh(); }} className="btn btn-ghost btn-sm" aria-label="Close">
              <CrossIcon size={11} />
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

      {/* match accept/decline confirm modal */}
      <Modal
        open={pitchConfirmStep !== "none"}
        onClose={closePitchConfirm}
        title={pitchConfirm?.action === "accept" ? "ACCEPT MATCH" : "DECLINE MATCH"}
      >
        {pitchConfirmStep === "review" && (
          <div className="space-y-3">
            <p className="mono" style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
              {pitchConfirm?.action === "accept"
                ? `Accepting this match from ${pitchConfirmMatch?.employers?.company_name ?? "this employer"} opens a chat so you can discuss the role, interview, and negotiate terms. This is not a commitment to accept a job.`
                : `Declining this match from ${pitchConfirmMatch?.employers?.company_name ?? "this employer"} ends the conversation. The employer will not be able to re-pitch you for this role.`}
            </p>
            <p className="kicker c-muted">
              {pitchConfirm?.action === "accept"
                ? "YOU ARE AGREEING TO A CONVERSATION, NOT AN OFFER."
                : "THIS CANNOT BE UNDONE."}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closePitchConfirm}>
                CANCEL
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPitchConfirmStep("final")}>
                CONTINUE →
              </Button>
            </div>
          </div>
        )}

        {pitchConfirmStep === "final" && (
          <div className="space-y-3">
            <p className="kicker" style={{ color: pitchConfirm?.action === "accept" ? "var(--up)" : "var(--down)" }}>
              {pitchConfirm?.action === "accept"
                ? "CONFIRM: OPEN CHAT WITH THIS EMPLOYER"
                : "CONFIRM: PERMANENTLY DECLINE THIS MATCH"}
            </p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={pitchConfirmChecked}
                onChange={(e) => setPitchConfirmChecked(e.target.checked)}
                className="mt-1"
              />
              <span className="mono" style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
                {pitchConfirm?.action === "accept"
                  ? "I understand that accepting opens a chat to discuss the role. A separate hire offer will follow if both sides agree."
                  : "I understand that declining is permanent and the employer cannot re-pitch me for this role."}
              </span>
            </label>
            {pitchConfirmError && <p className="kicker c-down">{pitchConfirmError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPitchConfirmStep("review")}>
                ← BACK
              </Button>
              <Button
                variant={pitchConfirm?.action === "accept" ? "primary" : "danger"}
                size="sm"
                disabled={!pitchConfirmChecked}
                loading={pitchConfirmSending}
                onClick={submitPitchConfirm}
              >
                {pitchConfirm?.action === "accept" ? "ACCEPT MATCH" : "DECLINE MATCH"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* hire offer confirm modal */}
      <Modal
        open={confirmStep !== "none"}
        onClose={closeOfferConfirm}
        title={offerConfirm?.action === "accept" ? "ACCEPT HIRE OFFER" : "DECLINE HIRE OFFER"}
      >
        {confirmStep === "review" && (
          <div className="space-y-3">
            <p className="mono" style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
              {offerConfirm?.action === "accept"
                ? `Accepting this hire offer${
                    confirmMatch?.offer_salary ? ` of ${formatSalary(confirmMatch.offer_salary)}/mo` : ""
                  } from ${confirmMatch?.employers?.company_name ?? "this employer"} finalises the salary and marks you as hired.`
                : `Declining this hire offer${
                    confirmMatch?.offer_salary ? ` of ${formatSalary(confirmMatch.offer_salary)}/mo` : ""
                  } from ${confirmMatch?.employers?.company_name ?? "this employer"} rejects the proposed salary. The chat remains open for further negotiation.`}
            </p>
            <p className="kicker c-muted">
              {offerConfirm?.action === "accept"
                ? "THIS IS THE FINAL SALARY AGREEMENT. YOU WILL BE MARKED AS HIRED."
                : "THE EMPLOYER MAY SEND A REVISED OFFER."}
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
              {offerConfirm?.action === "accept"
                ? "CONFIRM: ACCEPT SALARY AND FINALISE HIRE"
                : "CONFIRM: DECLINE THIS OFFER"}
            </p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                className="mt-1"
              />
              <span className="mono" style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
                {offerConfirm?.action === "accept"
                  ? `I understand that accepting this offer${confirmMatch?.offer_salary ? ` of ${formatSalary(confirmMatch.offer_salary)}/mo` : ""} is final and I will be marked as hired.`
                  : "I understand that declining rejects this offer. The employer may send a revised offer through the chat."}
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
                {offerConfirm?.action === "accept" ? "ACCEPT OFFER" : "DECLINE"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Renege confirm */}
      <Modal open={renegeStep !== "none"} onClose={closeRenege} title="RENEGE ON ACCEPTED OFFER">
        {renegeStep === "review" && (
          <div className="space-y-3">
            <p className="mono" style={{ fontSize: 13, color: "var(--text)" }}>
              You&apos;re about to RENEGE on your accepted hire offer. This reverses the hire.
            </p>
            <p className="kicker c-down">
              RENEGING REVERSES YOUR HIRE, PERMANENTLY CLOSES THIS MATCH, AND CARRIES A SEVERE
              REPUTATION PENALTY.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeRenege}>
                CANCEL
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRenegeStep("final")}>
                CONTINUE →
              </Button>
            </div>
          </div>
        )}

        {renegeStep === "final" && (
          <div className="space-y-3">
            <p className="kicker c-down">FINAL STEP — THIS CANNOT BE UNDONE</p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={renegeChecked}
                onChange={(e) => setRenegeChecked(e.target.checked)}
                className="mt-1"
              />
              <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                I understand that reneging reverses my hire, incurs a reputation penalty, and cannot be
                undone.
              </span>
            </label>
            {renegeError && <p className="kicker c-down">{renegeError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRenegeStep("review")}>
                ← BACK
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!renegeChecked}
                loading={renegeSending}
                onClick={submitRenege}
              >
                CONFIRM RENEGE
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

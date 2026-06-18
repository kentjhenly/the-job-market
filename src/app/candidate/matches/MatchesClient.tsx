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

const COLUMNS = "1rem 7rem 1.6fr 7rem 8rem 8rem 5.5rem 1rem";
const HEADERS = ["", "STATUS", "EMPLOYER", "REPUTATION", "OFFERED", "SENT", "", ""];

function reputationColor(reputation?: number | null) {
  return reputation == null ? "var(--muted)" : reputation >= 80 ? "var(--up)" : reputation >= 50 ? "var(--gold)" : "var(--down)";
}

function isUnread(m: Match) {
  return (
    !m.candidate_last_read_at ||
    new Date(m.last_message_at ?? m.created_at) > new Date(m.candidate_last_read_at)
  );
}

interface MatchesClientProps {
  matches: Match[];
}

export function MatchesClient({ matches: initial }: MatchesClientProps) {
  const [matches, setMatches] = useState<Match[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatMatchId, setChatMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [offerConfirm, setOfferConfirm] = useState<{ matchId: string; action: "accept" | "decline" } | null>(null);
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>("none");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmSending, setConfirmSending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

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
      setErrors((prev) => ({
        ...prev,
        [matchId]: json.error ?? "FAILED TO RESPOND",
      }));
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
    <div className="view-enter space-y-6">
      <div>
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          PITCHES
        </h1>
      </div>

      <div className="panel overflow-hidden">
        <div
          className="grid gap-3 px-4 py-2.5"
          style={{ gridTemplateColumns: COLUMNS, borderBottom: "1px solid var(--border-soft)" }}
        >
          {HEADERS.map((h, i) => (
            <span key={i} className="kicker">
              {h}
            </span>
          ))}
        </div>

        {matches.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="kicker">NO PITCHES YET. IMPROVE YOUR SKILL SCORE TO ATTRACT EMPLOYERS.</p>
          </div>
        ) : (
          matches.map((m, idx) => {
            const reputation = m.employers?.reputation_score;
            const sel = m.id === selectedId;
            const unread = isUnread(m);
            return (
              <div
                key={m.id}
                onClick={() => openRow(m)}
                className="grid cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                style={{
                  gridTemplateColumns: COLUMNS,
                  borderBottom: idx === matches.length - 1 ? "none" : "1px solid var(--border-soft)",
                  borderLeft: `2px solid ${sel ? "var(--up)" : "transparent"}`,
                  background: sel ? "var(--up-dim)" : "transparent",
                }}
              >
                <div className="flex items-center justify-center">
                  {unread && <span className="live-dot" title="Unread activity" />}
                </div>
                <div>
                  <Badge variant={statusVariant[m.status] ?? "muted"}>{m.status.toUpperCase()}</Badge>
                </div>
                <p className="mono truncate" style={{ fontSize: 13, color: "var(--text)" }}>
                  {m.employers?.company_name ?? "UNKNOWN COMPANY"}
                </p>
                <span className="mono tnum" style={{ fontSize: 11, color: reputationColor(reputation) }}>
                  {reputation != null ? `${reputation.toFixed(0)}/100` : "—"}
                </span>
                <span
                  className="mono tnum"
                  style={{ fontSize: 12, fontWeight: 600, color: m.offered_salary ? "var(--up)" : "var(--muted)" }}
                >
                  {m.offered_salary ? formatSalary(m.offered_salary) : "—"}
                </span>
                <span className="mono" style={{ fontSize: 11, color: m.status === "pending" ? "var(--gold)" : "var(--muted)" }}>
                  {m.status === "pending" ? `EXP ${formatRelativeTime(m.expires_at)}` : formatRelativeTime(m.created_at)}
                </span>
                <div className="flex items-center gap-1">
                  {m.status === "accepted" && m.offer_status === "pending" ? (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); startOfferConfirm(m, "accept"); }}
                        className="btn btn-primary"
                        style={{ fontSize: 11, padding: "4px 7px", lineHeight: 1 }}
                        title="Accept hire offer"
                      >
                        ✓
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); startOfferConfirm(m, "decline"); }}
                        className="btn btn-danger"
                        style={{ fontSize: 11, padding: "4px 7px", lineHeight: 1 }}
                        title="Decline hire offer"
                      >
                        ✗
                      </button>
                    </>
                  ) : m.status === "accepted" ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); openChat(m); }}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 10.5, whiteSpace: "nowrap" }}
                    >
                      CHAT →
                    </button>
                  ) : null}
                </div>
                <span className="mono" style={{ fontSize: 14, color: "var(--dim)" }}>
                  ›
                </span>
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
              {selected.offered_salary != null && (
                <DataRow label="OFFERED SALARY" value={formatSalary(selected.offered_salary)} color="up" />
              )}
              {selected.employers?.reputation_score != null && (
                <DataRow
                  label="EMPLOYER REPUTATION"
                  value={`${selected.employers.reputation_score.toFixed(0)}/100`}
                  color={selected.employers.reputation_score >= 80 ? "up" : selected.employers.reputation_score >= 50 ? "gold" : "down"}
                />
              )}
              <DataRow label="SENT" value={formatRelativeTime(selected.created_at)} />
              {selected.status === "pending" && (
                <DataRow label="EXPIRES" value={formatRelativeTime(selected.expires_at)} color="gold" />
              )}
            </div>

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
                <Button variant="danger" onClick={() => respond(selected.id, "decline")} loading={loading[selected.id]} className="flex-1">
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

      {/* hire offer accept/decline confirm */}
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
            <p
              className="kicker"
              style={{ color: offerConfirm?.action === "accept" ? "var(--up)" : "var(--down)" }}
            >
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
                {confirmMatch?.offer_salary ? ` of ${formatSalary(confirmMatch.offer_salary)}/mo` : ""} and
                cannot be changed afterwards.
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

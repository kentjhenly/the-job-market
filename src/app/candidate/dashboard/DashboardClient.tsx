"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ScoreTicker } from "@/components/terminal/ScoreTicker";
import { DataRow } from "@/components/terminal/DataRow";
import { Delta } from "@/components/terminal/Delta";
import { LiveDot } from "@/components/terminal/LiveDot";
import { RadarChart } from "@/components/charts/RadarChart";
import { SalaryCurve } from "@/components/charts/SalaryCurve";
import { Sparkline } from "@/components/charts/Sparkline";
import { SalaryEstimateFootnote } from "@/components/ui/SalaryEstimateFootnote";
import { formatPercentile, formatSalary, formatShortDate } from "@/lib/utils/formatters";
import { MAX_PORTFOLIO_PROJECTS } from "@/lib/utils/constants";
import type { Database } from "@/lib/supabase/types";

type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
type Profile = { display_name: string };
type PortfolioProject = {
  id: string;
  title: string;
  skills: string[];
  has_file: boolean;
  link_url: string | null;
  created_at: string;
};
type PostingSummary = {
  count: number;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  remote: boolean;
};
type PitchStats = {
  received: number;
  pending: number;
  accepted: number;
  declined: number;
  ghosted: number;
  nextExpiry: string | null;
};
type SkillGap = { label: string; count: number };
type ScorePoint = { composite_score: number; recorded_at: string };
type RecentMatch = {
  id: string;
  status: string;
  created_at: string;
  employers: { company_name: string } | null;
};

interface Props {
  candidateId: string;
  candidate: Candidate | null;
  profile: Profile | null;
  postingSummary: PostingSummary;
  pitchStats: PitchStats;
  skillGap: SkillGap[];
  projects: PortfolioProject[];
  scoreHistory: ScorePoint[];
  totalVisible: number;
  recentMatches: RecentMatch[];
}

// Human label for time until a pending pitch's 72h expiry.
function expiryLabel(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "SOON";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}M`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}H`;
  return `${Math.floor(hours / 24)}D`;
}

interface SalaryData {
  curve: { years_exp: number; predicted_salary: number; ci_lower: number; ci_upper: number }[];
  candidate_percentile: number;
  median_at_exp: number;
}

interface ActivityItem {
  date: Date;
  label: string;
  delta?: number;
  tag?: string;
}

// Mirrors the signal breakdown returned by /api/candidates/me/score, which in
// turn mirrors supabase/functions/recommendation-scorer/index.ts.
interface Signals {
  portfolio_breadth: number;
  portfolio_skill_coverage: number;
  portfolio_completeness: number;
  portfolio_feedback: number;
  reputation_score: number;
  response_rate: number;
  profile_completeness: number;
}

const SIGNAL_WEIGHTS: Record<keyof Signals, number> = {
  portfolio_breadth: 0.2,
  portfolio_skill_coverage: 0.25,
  portfolio_completeness: 0.1,
  portfolio_feedback: 0.1,
  reputation_score: 0.2,
  response_rate: 0.1,
  profile_completeness: 0.05,
};

// One suggestion per scorer signal, ranked by how much closing the gap to a
// perfect score (1.0) would move the weighted composite.
const SIGNAL_SUGGESTIONS: { key: keyof Signals; text: string }[] = [
  { key: "portfolio_skill_coverage", text: "Add a project covering new skills to widen your skill coverage." },
  { key: "portfolio_breadth", text: "Add another portfolio project to build out your breadth." },
  { key: "portfolio_completeness", text: "Attach a file or link and tag skills on every project to lift completeness." },
  { key: "profile_completeness", text: "Set your experience in Settings and add a position in Postings (role, location, salary)." },
  { key: "reputation_score", text: "Stay responsive in chats so accepted matches don't go silent and ghost." },
  { key: "response_rate", text: "Respond to pending pitches promptly to lift your response rate." },
  { key: "portfolio_feedback", text: "Keep portfolio projects accurate to your real skills, employers rate this after a match." },
];

const BREADTH_TARGET = 5;
const SKILL_COVERAGE_TARGET = 10;
const ACTIVITY_LIMIT = 6;
const POLL_INTERVAL_MS = 15000;

export function DashboardClient({
  candidateId,
  candidate: initial,
  postingSummary,
  pitchStats,
  skillGap,
  projects,
  scoreHistory: initialScoreHistory,
  totalVisible,
  recentMatches,
}: Props) {
  const [candidate, setCandidate] = useState<Candidate | null>(initial);
  const [scoreHistory, setScoreHistory] = useState<ScorePoint[]>(initialScoreHistory);
  const [signals, setSignals] = useState<Signals | null>(null);
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);

  // Fetch + poll for own score updates (Supabase Realtime is inert for Better Auth sessions, see CLAUDE.md)
  useEffect(() => {
    const fetchScore = () => {
      fetch("/api/candidates/me/score")
        .then((r) => r.json())
        .then((d) => {
          if (d.candidate) setCandidate(d.candidate);
          if (d.scoreHistory) setScoreHistory(d.scoreHistory);
          if (d.signals) setSignals(d.signals);
        })
        .catch(() => null);
    };

    fetchScore();
    const interval = setInterval(fetchScore, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [candidateId]);

  // Fetch salary data
  useEffect(() => {
    fetch("/api/salary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vertical: candidate?.current_job_vertical ?? "tech",
        role: candidate?.current_job_role ?? undefined,
        years_exp: (candidate?.years_exp_claimed ?? 0) + (candidate?.exp_months ?? 0) / 12,
        location: candidate?.current_job_location ?? candidate?.location ?? "Hong Kong",
      }),
    })
      .then((r) => r.json())
      .then((d) => !d.error && setSalaryData(d))
      .catch(() => null);
  }, [
    candidate?.years_exp_claimed,
    candidate?.exp_months,
    candidate?.current_job_vertical,
    candidate?.current_job_role,
    candidate?.current_job_location,
    candidate?.location,
  ]);

  const projectCount = projects.length;
  const distinctSkills = new Set(projects.flatMap((p) => p.skills)).size;
  const skillCoverage = Math.min(distinctSkills / SKILL_COVERAGE_TARGET, 1) * 100;
  const breadth = Math.min(projectCount / BREADTH_TARGET, 1) * 100;
  const completeness =
    projectCount > 0
      ? (projects.reduce((sum, p) => {
          const hasArtifact = p.has_file || p.link_url ? 0.5 : 0;
          const hasSkills = p.skills.length > 0 ? 0.5 : 0;
          return sum + hasArtifact + hasSkills;
        }, 0) /
          projectCount) *
        100
      : 0;

  const sortedHistory = [...scoreHistory].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );
  const sparklineData = sortedHistory.map((h) => h.composite_score);
  const scoreDelta =
    sortedHistory.length >= 2
      ? +(
          sortedHistory[sortedHistory.length - 1].composite_score -
          sortedHistory[sortedHistory.length - 2].composite_score
        ).toFixed(1)
      : 0;
  const d30 =
    sortedHistory.length >= 2
      ? +(sortedHistory[sortedHistory.length - 1].composite_score - sortedHistory[0].composite_score).toFixed(1)
      : 0;

  const percentile = candidate?.percentile_rank ?? 0;
  const rank = totalVisible > 0 ? Math.min(totalVisible, Math.max(1, Math.round(((100 - percentile) / 100) * totalVisible))) : null;

  // WAYS TO IMPROVE — ranked by how much closing each signal's gap to a
  // perfect score would move the weighted composite. Reads the same signal
  // breakdown recommendation-scorer computes (via /api/candidates/me/score);
  // falls back to an equivalent locally-derived estimate before that first
  // poll resolves.
  const profileCompletenessLocal =
    [candidate?.years_exp_claimed != null, postingSummary.count > 0].filter(Boolean).length / 2;

  const effectiveSignals: Signals =
    signals ?? {
      portfolio_breadth: breadth / 100,
      portfolio_skill_coverage: skillCoverage / 100,
      portfolio_completeness: completeness / 100,
      portfolio_feedback: 0.5,
      reputation_score: (candidate?.reputation_score ?? 100) / 100,
      response_rate: 0.5,
      profile_completeness: profileCompletenessLocal,
    };

  // Radar mirrors the composite-score signal breakdown (6 axes) so it reflects
  // exactly what moves the score, not a hand-picked subset.
  const radarDims = [
    {
      axis: "SKILL COVERAGE",
      you: effectiveSignals.portfolio_skill_coverage * 100,
      desc: "Distinct skills tagged across your portfolio. Add projects that cover new skills to widen it.",
    },
    {
      axis: "COMPLETENESS",
      you: effectiveSignals.portfolio_completeness * 100,
      desc: "Share of projects with a file or link and tagged skills. Attach artifacts and tag skills on every project.",
    },
    {
      axis: "BREADTH",
      you: effectiveSignals.portfolio_breadth * 100,
      desc: "How many portfolio projects you have. Add more projects to build out your breadth.",
    },
    {
      axis: "FEEDBACK",
      you: effectiveSignals.portfolio_feedback * 100,
      desc: "Employers' ratings of how well your portfolio reflects your real ability, gathered after matches.",
    },
    {
      axis: "REPUTATION",
      you: effectiveSignals.reputation_score * 100,
      desc: "Reliability from completed matches and avoiding ghosting. Respond and follow through to keep it high.",
    },
    {
      axis: "RESPONSE",
      you: effectiveSignals.response_rate * 100,
      desc: "How promptly you respond to pending pitches before they expire. Reply within the 72h window.",
    },
  ];

  const improvementSuggestions = SIGNAL_SUGGESTIONS.map((s) => ({
    text: s.text,
    gap: (1 - effectiveSignals[s.key]) * SIGNAL_WEIGHTS[s.key],
  }))
    .filter((s) => s.gap > 0.002)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3)
    .map((s) => s.text);

  // ACTIVITY LOG — merged from score history deltas, portfolio additions, and pitches
  const activity: ActivityItem[] = [];
  for (let i = 1; i < sortedHistory.length; i++) {
    const delta = +(sortedHistory[i].composite_score - sortedHistory[i - 1].composite_score).toFixed(1);
    if (delta !== 0) {
      activity.push({ date: new Date(sortedHistory[i].recorded_at), label: "COMPOSITE SCORE UPDATED", delta });
    }
  }
  for (const p of projects) {
    activity.push({ date: new Date(p.created_at), label: `PROJECT ADDED — ${p.title.toUpperCase()}`, tag: "PORTFOLIO" });
  }
  for (const m of recentMatches) {
    const company = (m.employers?.company_name ?? "EMPLOYER").toUpperCase();
    activity.push({ date: new Date(m.created_at), label: `PITCH RECEIVED — ${company}`, tag: "PITCH" });
  }
  activity.sort((a, b) => b.date.getTime() - a.date.getTime());
  const recentActivity = activity.slice(0, ACTIVITY_LIMIT);

  return (
    <div className="view-enter scroll-main space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="mono" style={{ color: "var(--text)", fontSize: 14, letterSpacing: "0.16em" }}>
            SCORE TERMINAL
          </h1>
        </div>
      </div>

      {/* Pending pitches awaiting response — pending pitches expire in 72h and
          ignoring them dents reputation, so surface them prominently. */}
      {pitchStats.pending > 0 && (
        <Link
          href="/candidate/matches"
          className="block"
          style={{
            border: "1px solid color-mix(in oklch, var(--gold) 40%, transparent)",
            background: "var(--gold-dim)",
            borderRadius: "var(--r-lg)",
          }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="mono" style={{ fontSize: 12, color: "var(--gold)", letterSpacing: "0.04em" }}>
              ▲ {pitchStats.pending} PITCH{pitchStats.pending > 1 ? "ES" : ""} AWAITING YOUR RESPONSE
              {expiryLabel(pitchStats.nextExpiry) ? ` · NEXT EXPIRES IN ${expiryLabel(pitchStats.nextExpiry)}` : ""}
            </span>
            <span className="mono" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: "0.08em" }}>
              RESPOND →
            </span>
          </div>
        </Link>
      )}

      {/* Hero: asymmetric score panel + position summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <div className="panel panel-accent flex flex-col">
          <div className="panel-head">
            <span className="panel-title">COMPOSITE SCORE</span>
            <LiveDot label="LIVE" />
          </div>
          <div className="flex flex-1 flex-col p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <ScoreTicker score={candidate?.composite_score ?? 0} size="xl" suffix="/100" />
                <div className="mt-3 flex flex-wrap items-center gap-3.5">
                  {scoreDelta !== 0 && <Delta value={scoreDelta} />}
                  {d30 !== 0 && (
                    <span
                      className="mono tnum"
                      style={{ fontSize: 12, fontWeight: 600, color: d30 >= 0 ? "var(--up)" : "var(--down)" }}
                    >
                      30D {d30 >= 0 ? "+" : ""}
                      {d30.toFixed(1)}
                    </span>
                  )}
                  <Badge variant="gold">{formatPercentile(percentile)}</Badge>
                </div>
              </div>
              {rank != null && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-end gap-3">
                    <span className="kicker">RANK</span>
                    <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", minWidth: 60, textAlign: "right" }}>
                      #{rank} OF {totalVisible}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-1 flex-col">
              {sparklineData.length >= 2 ? (
                <>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="kicker">GROWTH TRAJECTORY · 30D</span>
                    {d30 !== 0 && (
                      <span
                        className="mono tnum"
                        style={{ fontSize: 10.5, fontWeight: 600, color: d30 >= 0 ? "var(--up)" : "var(--down)" }}
                      >
                        {d30 >= 0 ? "▲ UP" : "▼ DOWN"} {Math.abs(d30).toFixed(1)} PTS
                      </span>
                    )}
                  </div>
                  <Sparkline data={sparklineData} w={620} h={110} className="flex-1" />
                  <div className="mt-1.5 flex justify-between">
                    <span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>
                      {formatShortDate(sortedHistory[0].recorded_at)} · {sortedHistory[0].composite_score.toFixed(0)}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>
                      TODAY · {sortedHistory[sortedHistory.length - 1].composite_score.toFixed(1)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <p className="kicker">NOT ENOUGH SCORE HISTORY YET</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="panel flex flex-col">
          <div className="panel-head">
            <span className="panel-title">SKILL RADAR</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>
              YOUR SIGNALS
            </span>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            <RadarChart dims={radarDims} />
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel flex flex-col">
          <div className="panel-head">
            <span className="panel-title">POSITION SUMMARY</span>
          </div>
          <div className="flex flex-1 flex-col p-4">
            <DataRow label="REPUTATION" value={`${(candidate?.reputation_score ?? 100).toFixed(0)}/100`} color="up" />
            <DataRow label="PORTFOLIO" value={`${projectCount} / ${MAX_PORTFOLIO_PROJECTS}`} />
            <DataRow
              label="MARKET MEDIAN"
              value={salaryData?.median_at_exp ? formatSalary(salaryData.median_at_exp) : "—"}
              color="up"
            />
            <div
              className="mt-3 flex flex-1 flex-col"
              style={{
                border: "1px solid color-mix(in oklch, var(--gold) 35%, transparent)",
                background: "var(--gold-dim)",
                borderRadius: "var(--r)",
                padding: "11px 13px",
              }}
            >
              <p className="mono" style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.16em" }}>
                WAYS TO IMPROVE
              </p>
              {improvementSuggestions.length > 0 ? (
                <ul className="mt-1.5 space-y-1.5">
                  {improvementSuggestions.map((text, i) => (
                    <li
                      key={i}
                      className="mono flex gap-2"
                      style={{ fontSize: 11.5, color: "var(--text)", lineHeight: 1.5 }}
                    >
                      <span style={{ color: "var(--gold)" }}>{i + 1}.</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mono mt-1.5" style={{ fontSize: 11.5, color: "var(--text)", lineHeight: 1.55 }}>
                  Your profile is in great shape. Keep shipping new portfolio work to stay ahead.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">SALARY POSITION</span>
            {salaryData && <span className="badge badge-up">{salaryData.candidate_percentile}TH PERCENTILE</span>}
          </div>
          <div className="p-4">
            {salaryData ? (
              <>
                <SalaryCurve
                  curve={salaryData.curve}
                  candYears={candidate?.years_exp_claimed ?? undefined}
                  candMin={candidate?.current_salary ?? undefined}
                  height={210}
                />
                <p className="mono mt-1.5 text-center" style={{ fontSize: 10.5, color: "var(--dim)" }}>
                  <span style={{ color: "var(--up)", marginRight: 4 }}>―</span>MARKET REGRESSION &nbsp;&nbsp;
                  <span style={{ color: "color-mix(in oklch, var(--up) 30%, transparent)", marginRight: 4 }}>▮</span>CONFIDENCE BAND &nbsp;&nbsp;
                  <span style={{ color: "var(--gold)", marginRight: 4 }}>┊</span>YOUR SALARY @ {candidate?.years_exp_claimed ?? 0}Y
                </p>
                <SalaryEstimateFootnote />
              </>
            ) : (
              <div className="flex h-52 items-center justify-center">
                <p className="kicker">
                  {candidate?.years_exp_claimed
                    ? "LOADING MARKET DATA..."
                    : "SET YOUR EXPERIENCE IN SETTINGS TO SEE SALARY CURVE"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pitch pipeline + in-demand skills */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">PITCH PIPELINE</span>
            <Link href="/candidate/matches" className="link-up mono" style={{ fontSize: 11 }}>
              VIEW ALL
            </Link>
          </div>
          <div className="px-4">
            <DataRow label="RECEIVED" value={pitchStats.received} />
            <DataRow
              label="PENDING"
              value={pitchStats.pending}
              color={pitchStats.pending > 0 ? "gold" : undefined}
            />
            <DataRow
              label="ACCEPTED"
              value={pitchStats.accepted}
              color={pitchStats.accepted > 0 ? "up" : undefined}
            />
            <DataRow label="DECLINED" value={pitchStats.declined} />
            <DataRow
              label="RESPONSE RATE"
              value={pitchStats.received > 0 ? `${Math.round(effectiveSignals.response_rate * 100)}%` : "—"}
              color={pitchStats.received > 0 ? "up" : undefined}
            />
          </div>
        </div>

        <div className="panel flex flex-col">
          <div className="panel-head">
            <span className="panel-title">IN-DEMAND SKILLS</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>
              GAPS IN YOUR PORTFOLIO
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center p-4">
            {skillGap.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {skillGap.map((s) => (
                    <span
                      key={s.label}
                      className="badge badge-muted"
                      title={`${s.count} open role${s.count > 1 ? "s" : ""} want this skill`}
                    >
                      {s.label} · {s.count}
                    </span>
                  ))}
                </div>
                <p className="mono mt-3" style={{ fontSize: 10.5, color: "var(--dim)", lineHeight: 1.6 }}>
                  Skills open roles are hiring for that your portfolio doesn&apos;t tag yet. Add a project covering
                  these to climb the feed.
                </p>
              </>
            ) : (
              <div className="flex h-20 items-center justify-center px-4">
                <p className="kicker text-center">YOUR PORTFOLIO COVERS THE TOP IN-DEMAND SKILLS</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity log */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">ACTIVITY LOG</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>
            RECENT
          </span>
        </div>
        {recentActivity.length > 0 ? (
          <div>
            {recentActivity.map((a, i) => (
              <div
                key={i}
                className="grid items-center gap-3.5 px-4 py-2.5"
                style={{
                  gridTemplateColumns: "4.5rem 1fr auto",
                  borderBottom: i < recentActivity.length - 1 ? "1px solid var(--border-soft)" : "none",
                }}
              >
                <span className="mono tnum" style={{ fontSize: 10.5, color: "var(--dim)" }}>
                  {formatShortDate(a.date)}
                </span>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--text-2)" }}>
                  {a.label}
                </span>
                {a.delta != null ? <Delta value={a.delta} /> : <span className="badge badge-muted">{a.tag}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-20 items-center justify-center">
            <p className="kicker">NO RECENT ACTIVITY</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { ScoreTicker } from "@/components/terminal/ScoreTicker";
import { DataRow } from "@/components/terminal/DataRow";
import { Delta } from "@/components/terminal/Delta";
import { LiveDot } from "@/components/terminal/LiveDot";
import { RadarChart } from "@/components/charts/RadarChart";
import { SalaryCurve } from "@/components/charts/SalaryCurve";
import { Sparkline } from "@/components/charts/Sparkline";
import { formatPercentile, formatSalaryBand, formatShortDate } from "@/lib/utils/formatters";
import { MAX_PORTFOLIO_PROJECTS, FREE_MATCH_ACCEPTS } from "@/lib/utils/constants";
import type { Database } from "@/lib/supabase/types";

type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
type Profile = { display_name: string };
type PortfolioProject = {
  id: string;
  title: string;
  skills: string[];
  file_path: string | null;
  link_url: string | null;
  created_at: string;
};
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
  projects: PortfolioProject[];
  scoreHistory: ScorePoint[];
  totalVisible: number;
  recentMatches: RecentMatch[];
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

const BREADTH_TARGET = 5;
const SKILL_COVERAGE_TARGET = 10;
const ACTIVITY_LIMIT = 6;

export function DashboardClient({
  candidateId,
  candidate: initial,
  profile,
  projects,
  scoreHistory,
  totalVisible,
  recentMatches,
}: Props) {
  const [candidate, setCandidate] = useState<Candidate | null>(initial);
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const supabase = getSupabaseBrowserClient();

  // Realtime: listen for own candidate row updates (score changes)
  useEffect(() => {
    const channel = supabase
      .channel(`candidate:${candidateId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "candidates",
          filter: `id=eq.${candidateId}`,
        },
        (payload) => {
          setCandidate(payload.new as Candidate);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [candidateId, supabase]);

  // Fetch salary data
  useEffect(() => {
    fetch("/api/salary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vertical: "tech",
        years_exp: candidate?.years_exp_claimed ?? 0,
        location: candidate?.location ?? "Hong Kong",
      }),
    })
      .then((r) => r.json())
      .then((d) => !d.error && setSalaryData(d))
      .catch(() => null);
  }, [candidate?.years_exp_claimed, candidate?.location]);

  const projectCount = projects.length;
  const distinctSkills = new Set(projects.flatMap((p) => p.skills)).size;
  const skillCoverage = Math.min(distinctSkills / SKILL_COVERAGE_TARGET, 1) * 100;
  const breadth = Math.min(projectCount / BREADTH_TARGET, 1) * 100;
  const completeness =
    projectCount > 0
      ? (projects.reduce((sum, p) => {
          const hasArtifact = p.file_path || p.link_url ? 0.5 : 0;
          const hasSkills = p.skills.length > 0 ? 0.5 : 0;
          return sum + hasArtifact + hasSkills;
        }, 0) /
          projectCount) *
        100
      : 0;

  const radarDims = [
    { axis: "SKILL COVERAGE", you: skillCoverage, peer: 60 },
    { axis: "COMPLETENESS", you: completeness, peer: 55 },
    { axis: "BREADTH", you: breadth, peer: 40 },
    { axis: "REPUTATION", you: candidate?.reputation_score ?? 100, peer: 80 },
    { axis: "PROFILE", you: candidate?.years_exp_claimed ? 100 : 50, peer: 70 },
  ];

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
  const hi30 = sparklineData.length ? Math.max(...sparklineData) : candidate?.composite_score ?? 0;
  const lo30 = sparklineData.length ? Math.min(...sparklineData) : candidate?.composite_score ?? 0;

  const freeAcceptsRemaining = Math.max(0, FREE_MATCH_ACCEPTS - (candidate?.free_accepts_used ?? 0));

  const percentile = candidate?.percentile_rank ?? 0;
  const rank = totalVisible > 0 ? Math.min(totalVisible, Math.max(1, Math.round(((100 - percentile) / 100) * totalVisible))) : null;

  // NEXT BEST ACTION — derived from the same signals recommendation-scorer weighs
  let nextAction: string;
  if (projectCount === 0) {
    nextAction = "ADD YOUR FIRST PORTFOLIO PROJECT → ESTABLISHES BREADTH, COVERAGE & COMPLETENESS";
  } else if (distinctSkills < SKILL_COVERAGE_TARGET) {
    nextAction = "ADD A PROJECT TAGGED WITH NEW SKILLS → IMPROVES SKILL COVERAGE";
  } else if (projectCount < BREADTH_TARGET) {
    nextAction = "ADD ANOTHER PORTFOLIO PROJECT → IMPROVES BREADTH";
  } else if (completeness < 100) {
    nextAction = "ATTACH A FILE OR LINK TO AN EXISTING PROJECT → IMPROVES COMPLETENESS";
  } else {
    nextAction = "PORTFOLIO LOOKS STRONG — KEEP IT UPDATED AS YOU SHIP NEW WORK";
  }

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
          <p className="mono mt-1" style={{ fontSize: 11.5, color: "var(--muted)" }}>
            {(profile?.display_name ?? "CANDIDATE").toUpperCase()} · TECH · {(candidate?.location ?? "HONG KONG").toUpperCase()}
          </p>
        </div>
        <Badge variant={candidate?.is_visible ? "up" : "muted"}>
          {candidate?.is_visible ? "VISIBLE TO EMPLOYERS" : "HIDDEN"}
        </Badge>
      </div>

      {/* Hero: asymmetric score panel + position summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <div className="panel panel-accent">
          <div className="panel-head">
            <span className="panel-title">COMPOSITE SCORE — {(profile?.display_name ?? "CANDIDATE").toUpperCase()}</span>
            <LiveDot label="LIVE" />
          </div>
          <div className="p-4">
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
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-end gap-3">
                  <span className="kicker">30D HIGH</span>
                  <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--up)", minWidth: 60, textAlign: "right" }}>
                    {hi30.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-baseline justify-end gap-3">
                  <span className="kicker">30D LOW</span>
                  <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--down)", minWidth: 60, textAlign: "right" }}>
                    {lo30.toFixed(1)}
                  </span>
                </div>
                {rank != null && (
                  <div className="flex items-baseline justify-end gap-3">
                    <span className="kicker">RANK</span>
                    <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", minWidth: 60, textAlign: "right" }}>
                      #{rank} OF {totalVisible}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4">
              {sparklineData.length >= 2 ? (
                <>
                  <Sparkline data={sparklineData} w={620} h={110} />
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
                <div className="flex h-24 items-center justify-center">
                  <p className="kicker">NOT ENOUGH SCORE HISTORY YET</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">POSITION SUMMARY</span>
          </div>
          <div className="p-4">
            <DataRow label="PERCENTILE" value={`${Math.round(percentile)}th`} color="gold" />
            <DataRow label="REPUTATION" value={`${(candidate?.reputation_score ?? 100).toFixed(0)}/100`} color="up" />
            <DataRow label="PORTFOLIO" value={`${projectCount} / ${MAX_PORTFOLIO_PROJECTS}`} />
            <DataRow
              label="MATCH CREDITS"
              value={
                freeAcceptsRemaining > 0
                  ? `${candidate?.credits ?? 0} (+${freeAcceptsRemaining} FREE)`
                  : `${candidate?.credits ?? 0}`
              }
              color={freeAcceptsRemaining > 0 || (candidate?.credits ?? 0) > 0 ? "up" : "down"}
            />
            <DataRow
              label="SALARY FLOOR"
              value={
                candidate?.desired_salary_min && candidate?.desired_salary_max
                  ? formatSalaryBand(candidate.desired_salary_min, candidate.desired_salary_max)
                  : "NOT SET"
              }
            />
            <DataRow
              label="MARKET STATUS"
              value={candidate?.is_visible ? "VISIBLE" : "HIDDEN"}
              color={candidate?.is_visible ? "up" : undefined}
            />
            <Link
              href="/candidate/portfolio"
              className="mt-3 block"
              style={{
                border: "1px solid color-mix(in oklch, var(--gold) 35%, transparent)",
                background: "var(--gold-dim)",
                borderRadius: "var(--r)",
                padding: "11px 13px",
              }}
            >
              <p className="mono" style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.16em" }}>
                NEXT BEST ACTION
              </p>
              <p className="mono mt-1.5" style={{ fontSize: 11.5, color: "var(--text)", lineHeight: 1.55 }}>
                {nextAction}
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">SKILL RADAR</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>
              YOU vs PEER AVG
            </span>
          </div>
          <div className="p-4">
            <RadarChart dims={radarDims} />
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
                  candMin={candidate?.desired_salary_min ?? undefined}
                  height={210}
                />
                <p className="mono mt-1.5 text-center" style={{ fontSize: 10.5, color: "var(--dim)" }}>
                  <span style={{ color: "var(--up)" }}>―</span> MARKET REGRESSION &nbsp;&nbsp;
                  <span style={{ color: "var(--gold)" }}>┊</span> YOUR FLOOR @ {candidate?.years_exp_claimed ?? 0}Y
                </p>
              </>
            ) : (
              <div className="flex h-52 items-center justify-center">
                <p className="kicker">
                  {candidate?.years_exp_claimed
                    ? "LOADING MARKET DATA..."
                    : "SET EXPERIENCE IN PROFILE TO SEE SALARY CURVE"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity log + profile */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
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

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">PROFILE</span>
            <Link href="/candidate/profile" className="link-up mono" style={{ fontSize: 11 }}>
              EDIT
            </Link>
          </div>
          <div className="px-4">
            <DataRow
              label="EXPERIENCE"
              value={candidate?.years_exp_claimed != null ? `${candidate.years_exp_claimed} YRS` : "NOT SET"}
            />
            <DataRow label="LOCATION" value={candidate?.location ?? "NOT SET"} />
            <DataRow label="VERTICAL" value="TECH" />
            <DataRow label="REMOTE ONLY" value={candidate?.remote_only ? "YES" : "NO"} color={candidate?.remote_only ? "up" : undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}

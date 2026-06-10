"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { ScoreTicker } from "@/components/terminal/ScoreTicker";
import { DataRow } from "@/components/terminal/DataRow";
import { Delta } from "@/components/terminal/Delta";
import { StatCard } from "@/components/terminal/StatCard";
import { RadarChart } from "@/components/charts/RadarChart";
import { SalaryCurve } from "@/components/charts/SalaryCurve";
import { Sparkline } from "@/components/charts/Sparkline";
import { formatPercentile, formatSalaryBand } from "@/lib/utils/formatters";
import type { Database } from "@/lib/supabase/types";

type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
type Profile = { display_name: string };
type Result = {
  challenge_id: string;
  raw_score: number | null;
  normalised_score: number | null;
  scored_at: string;
};
type Challenge = { id: string; title: string; vertical: string };
type ScorePoint = { composite_score: number; recorded_at: string };

interface Props {
  candidateId: string;
  candidate: Candidate | null;
  profile: Profile | null;
  results: Result[];
  scoreHistory: ScorePoint[];
  challenges: Challenge[];
}

interface SalaryData {
  curve: { years_exp: number; predicted_salary: number; ci_lower: number; ci_upper: number }[];
  candidate_percentile: number;
  median_at_exp: number;
}

export function DashboardClient({
  candidateId,
  candidate: initial,
  profile,
  results,
  scoreHistory,
  challenges,
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
  }, [candidateId]);

  // Fetch salary data
  useEffect(() => {
    if (!candidate?.years_exp_claimed) return;

    fetch("/api/salary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vertical: "tech",
        years_exp: candidate.years_exp_claimed,
        location: candidate.location ?? "Singapore",
      }),
    })
      .then((r) => r.json())
      .then((d) => !d.error && setSalaryData(d))
      .catch(() => null);
  }, [candidate?.years_exp_claimed, candidate?.location]);

  const completedIds = new Set(results.map((r) => r.challenge_id));
  const completedCount = completedIds.size;
  const avgScore =
    results.length > 0
      ? results.reduce((s, r) => s + (r.raw_score ?? 0), 0) / results.length
      : 0;

  const radarDims = [
    { axis: "AVG SCORE", you: avgScore, peer: 60 },
    { axis: "SPEED", you: 65, peer: 55 },
    { axis: "BREADTH", you: (completedCount / 5) * 100, peer: 40 },
    { axis: "REPUTATION", you: candidate?.reputation_score ?? 100, peer: 80 },
    { axis: "PROFILE", you: candidate?.years_exp_claimed ? 100 : 50, peer: 70 },
  ];

  const sortedHistory = [...scoreHistory].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );
  const sparklineData = sortedHistory.map((h) => h.composite_score);
  const scoreDelta =
    sortedHistory.length >= 2
      ? sortedHistory[sortedHistory.length - 1].composite_score -
        sortedHistory[sortedHistory.length - 2].composite_score
      : 0;

  return (
    <div className="view-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
            SCORE TERMINAL
          </h1>
          <p className="mono mt-0.5" style={{ fontSize: 11, color: "var(--muted)" }}>
            {profile?.display_name ?? "CANDIDATE"}
          </p>
        </div>
        <Badge variant={candidate?.is_visible ? "up" : "muted"}>
          {candidate?.is_visible ? "VISIBLE TO EMPLOYERS" : "HIDDEN"}
        </Badge>
      </div>

      {/* Score panels */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="COMPOSITE SCORE"
          footer={
            scoreDelta !== 0 ? (
              <Delta value={scoreDelta} />
            ) : (
              <span className="mono" style={{ fontSize: 11, color: "var(--dim)" }}>
                NO CHANGE
              </span>
            )
          }
        >
          <ScoreTicker score={candidate?.composite_score ?? 0} size="xl" suffix="/100" />
        </StatCard>

        <StatCard label="PERCENTILE RANK">
          <span className="mono tnum" style={{ fontSize: 40, fontWeight: 700, color: "var(--gold)", lineHeight: 1 }}>
            {Math.round(candidate?.percentile_rank ?? 0)}
            <span style={{ fontSize: 16, color: "var(--muted)" }}>th</span>
          </span>
          <p className="mono mt-2" style={{ fontSize: 11, color: "var(--muted)" }}>
            {formatPercentile(candidate?.percentile_rank ?? 0)}
          </p>
        </StatCard>

        <StatCard
          label="CHALLENGES"
          footer={
            <Link href="/candidate/challenges" className="link-up mono" style={{ fontSize: 11 }}>
              TAKE MORE →
            </Link>
          }
        >
          <span className="mono tnum" style={{ fontSize: 40, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
            {completedCount}
            <span style={{ fontSize: 16, color: "var(--muted)" }}> / {challenges.length}</span>
          </span>
        </StatCard>

        <StatCard label="REPUTATION" footer={<span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>RESPONSE SCORE</span>}>
          <span className="mono tnum" style={{ fontSize: 40, fontWeight: 700, color: "var(--up)", lineHeight: 1 }}>
            {(candidate?.reputation_score ?? 100).toFixed(0)}
          </span>
        </StatCard>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">SKILL RADAR</span>
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
              <SalaryCurve
                curve={salaryData.curve}
                candYears={candidate?.years_exp_claimed ?? undefined}
                candMin={candidate?.desired_salary_min ?? undefined}
                height={210}
              />
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

      {/* Score history + profile data */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">SCORE HISTORY</span>
          </div>
          <div className="px-4 pb-4 pt-3">
            {sparklineData.length >= 2 ? (
              <Sparkline data={sparklineData} h={64} />
            ) : (
              <div className="flex h-16 items-center justify-center">
                <p className="kicker">NOT ENOUGH DATA</p>
              </div>
            )}
          </div>
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
            <DataRow
              label="SALARY FLOOR"
              value={
                candidate?.desired_salary_min && candidate?.desired_salary_max
                  ? formatSalaryBand(candidate.desired_salary_min, candidate.desired_salary_max)
                  : "NOT SET"
              }
            />
            <DataRow label="REMOTE ONLY" value={candidate?.remote_only ? "YES" : "NO"} color={candidate?.remote_only ? "up" : undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}

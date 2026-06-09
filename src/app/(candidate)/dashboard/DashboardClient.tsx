"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ScoreTicker } from "@/components/terminal/ScoreTicker";
import { DataRow } from "@/components/terminal/DataRow";
import { Badge } from "@/components/ui/Badge";
import { ScoreRadarChart } from "@/components/charts/ScoreRadarChart";
import { SalaryCurveChart } from "@/components/charts/SalaryCurveChart";
import { ScoreHistorySparkline } from "@/components/charts/ScoreHistorySparkline";
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

  const radarDimensions = [
    { subject: "AVG SCORE", score: avgScore, peerAvg: 60 },
    { subject: "SPEED", score: 65, peerAvg: 55 },
    { subject: "BREADTH", score: (completedCount / 5) * 100, peerAvg: 40 },
    {
      subject: "REPUTATION",
      score: candidate?.reputation_score ?? 100,
      peerAvg: 80,
    },
    {
      subject: "PROFILE",
      score: candidate?.years_exp_claimed ? 100 : 50,
      peerAvg: 70,
    },
  ];

  const scoreColor =
    (candidate?.composite_score ?? 0) >= 90
      ? "gold"
      : (candidate?.composite_score ?? 0) >= 60
        ? "green"
        : "danger";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-green text-sm tracking-widest">SCORE TERMINAL</h1>
          <p className="text-muted text-xs font-mono mt-0.5">
            {profile?.display_name ?? "CANDIDATE"}
          </p>
        </div>
        <Badge variant={scoreColor}>
          {candidate?.is_visible ? "VISIBLE TO EMPLOYERS" : "HIDDEN"}
        </Badge>
      </div>

      {/* Score panels */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardTitle className="mb-3">COMPOSITE SCORE</CardTitle>
          <ScoreTicker
            score={candidate?.composite_score ?? 0}
            size="lg"
            showLabel
          />
        </Card>

        <Card>
          <CardTitle className="mb-3">PERCENTILE RANK</CardTitle>
          <div className="font-mono text-4xl font-bold text-gold">
            {Math.round(candidate?.percentile_rank ?? 0)}
            <span className="text-muted text-xs ml-1 align-middle">th</span>
          </div>
          <p className="text-muted text-xs font-mono mt-2">
            {formatPercentile(candidate?.percentile_rank ?? 0)}
          </p>
        </Card>

        <Card>
          <CardTitle className="mb-3">CHALLENGES</CardTitle>
          <div className="font-mono text-4xl font-bold text-white">
            {completedCount}
            <span className="text-muted text-sm ml-1">/ {challenges.length}</span>
          </div>
          <Link
            href="/challenges"
            className="text-green text-xs font-mono mt-2 block hover:underline"
          >
            TAKE MORE →
          </Link>
        </Card>

        <Card>
          <CardTitle className="mb-3">REPUTATION</CardTitle>
          <div className="font-mono text-4xl font-bold text-green">
            {(candidate?.reputation_score ?? 100).toFixed(0)}
          </div>
          <p className="text-muted text-xs font-mono mt-2">RESPONSE SCORE</p>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card noPadding>
          <CardHeader>
            <CardTitle>SKILL RADAR</CardTitle>
          </CardHeader>
          <div className="p-4">
            <ScoreRadarChart dimensions={radarDimensions} />
          </div>
        </Card>

        <Card noPadding>
          <CardHeader>
            <CardTitle>SALARY POSITION</CardTitle>
            {salaryData && (
              <span className="font-mono text-xs text-green">
                {salaryData.candidate_percentile}th PERCENTILE
              </span>
            )}
          </CardHeader>
          <div className="p-4">
            {salaryData ? (
              <SalaryCurveChart
                curve={salaryData.curve}
                candidateYearsExp={candidate?.years_exp_claimed ?? undefined}
                candidateSalaryMin={candidate?.desired_salary_min ?? undefined}
              />
            ) : (
              <div className="h-52 flex items-center justify-center">
                <p className="font-mono text-muted text-xs">
                  {candidate?.years_exp_claimed
                    ? "LOADING MARKET DATA..."
                    : "SET EXPERIENCE IN PROFILE TO SEE SALARY CURVE"}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Score history + profile data */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card noPadding>
          <CardHeader>
            <CardTitle>SCORE HISTORY</CardTitle>
          </CardHeader>
          <div className="px-4 pb-4">
            <ScoreHistorySparkline data={scoreHistory} />
          </div>
        </Card>

        <Card noPadding>
          <CardHeader>
            <CardTitle>PROFILE</CardTitle>
            <Link href="/profile" className="font-mono text-xs text-green hover:underline">
              EDIT
            </Link>
          </CardHeader>
          <div className="px-4 py-2">
            <DataRow
              label="EXPERIENCE"
              value={
                candidate?.years_exp_claimed != null
                  ? `${candidate.years_exp_claimed} YRS`
                  : "NOT SET"
              }
            />
            <DataRow
              label="LOCATION"
              value={candidate?.location ?? "NOT SET"}
            />
            <DataRow
              label="SALARY FLOOR"
              value={
                candidate?.desired_salary_min && candidate?.desired_salary_max
                  ? formatSalaryBand(
                      candidate.desired_salary_min,
                      candidate.desired_salary_max
                    )
                  : "NOT SET"
              }
            />
            <DataRow
              label="REMOTE ONLY"
              value={candidate?.remote_only ? "YES" : "NO"}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

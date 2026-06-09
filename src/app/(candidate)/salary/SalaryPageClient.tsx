"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataRow } from "@/components/terminal/DataRow";
import { SalaryCurveChart } from "@/components/charts/SalaryCurveChart";
import { formatSalary, formatPercentile } from "@/lib/utils/formatters";
import type { Database } from "@/lib/supabase/types";

type Candidate = Database["public"]["Tables"]["candidates"]["Row"];

interface SalaryData {
  curve: { years_exp: number; predicted_salary: number; ci_lower: number; ci_upper: number }[];
  candidate_percentile: number;
  median_at_exp: number;
}

export function SalaryPageClient({ candidate }: { candidate: Candidate | null }) {
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!candidate?.years_exp_claimed) return;
    setLoading(true);

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
      .then((d) => {
        if (!d.error) setSalaryData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [candidate?.years_exp_claimed, candidate?.location]);

  if (!candidate?.years_exp_claimed) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-mono text-green text-sm tracking-widest mb-6">SALARY ENGINE</h1>
        <div className="border border-border bg-surface p-8 text-center">
          <p className="font-mono text-muted text-xs">
            SET YOUR YEARS OF EXPERIENCE IN YOUR PROFILE TO SEE YOUR MARKET SALARY POSITION.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-mono text-green text-sm tracking-widest">SALARY ENGINE</h1>
        <p className="text-muted text-xs font-mono mt-1">
          SINGAPORE TECH MARKET · DEGREE-2 REGRESSION MODEL
        </p>
      </div>

      <Card noPadding>
        <CardHeader>
          <CardTitle>MARKET SALARY CURVE</CardTitle>
          {salaryData && (
            <span className="font-mono text-xs text-green">
              YOUR POSITION: {formatPercentile(salaryData.candidate_percentile)}
            </span>
          )}
        </CardHeader>
        <div className="p-4">
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <p className="font-mono text-muted text-xs animate-pulse">COMPUTING REGRESSION...</p>
            </div>
          ) : salaryData ? (
            <SalaryCurveChart
              curve={salaryData.curve}
              candidateYearsExp={candidate.years_exp_claimed ?? undefined}
              candidateSalaryMin={candidate.desired_salary_min ?? undefined}
            />
          ) : (
            <div className="h-52 flex items-center justify-center">
              <p className="font-mono text-muted text-xs">NO SALARY DATA AVAILABLE</p>
            </div>
          )}
        </div>
      </Card>

      {salaryData && (
        <Card noPadding>
          <CardHeader>
            <CardTitle>YOUR MARKET POSITION</CardTitle>
          </CardHeader>
          <div className="px-4 py-2">
            <DataRow
              label="MARKET MEDIAN (YOUR EXP)"
              value={formatSalary(salaryData.median_at_exp)}
              valueColor="green"
            />
            <DataRow
              label="YOUR PERCENTILE"
              value={formatPercentile(salaryData.candidate_percentile)}
              valueColor="gold"
            />
            <DataRow
              label="YOUR FLOOR"
              value={
                candidate.desired_salary_min
                  ? formatSalary(candidate.desired_salary_min)
                  : "NOT SET"
              }
            />
            <DataRow label="YEARS EXPERIENCE" value={`${candidate.years_exp_claimed} YRS`} />
            <DataRow label="LOCATION" value={candidate.location ?? "SINGAPORE"} />
          </div>
        </Card>
      )}

      {salaryData && (
        <div className="border border-border bg-surface p-4">
          <p className="font-mono text-xs text-muted leading-relaxed">
            <span className="text-green">MARGINAL VALUE:</span> Based on the regression curve,
            each additional year of experience at your level is worth approximately{" "}
            <span className="text-white">
              {formatSalary(
                Math.max(
                  0,
                  (salaryData.curve[Math.min(candidate.years_exp_claimed! + 1, 20)]
                    ?.predicted_salary ?? 0) -
                    salaryData.median_at_exp
                )
              )}
            </span>{" "}
            in additional annual salary.
          </p>
        </div>
      )}
    </div>
  );
}

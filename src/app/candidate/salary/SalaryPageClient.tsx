"use client";

import { useEffect, useState } from "react";
import { DataRow } from "@/components/terminal/DataRow";
import { SalaryCurve } from "@/components/charts/SalaryCurve";
import { formatSalary, formatPercentile } from "@/lib/utils/formatters";
import type { Database } from "@/lib/supabase/types";

type Candidate = Database["public"]["Tables"]["candidates"]["Row"];

interface SalaryData {
  curve: { years_exp: number; predicted_salary: number; ci_lower: number; ci_upper: number }[];
  candidate_percentile: number;
  median_at_exp: number;
}

export function SalaryPageClient({ candidate }: { candidate: Candidate | null }) {
  const [result, setResult] = useState<{ key: string; data: SalaryData | null } | null>(null);

  const fetchKey = candidate?.years_exp_claimed
    ? `${candidate.years_exp_claimed}-${candidate.location ?? ""}`
    : null;
  const salaryData = result?.key === fetchKey ? result.data : null;
  const loading = fetchKey !== null && result?.key !== fetchKey;

  useEffect(() => {
    if (!fetchKey || !candidate?.years_exp_claimed) return;

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
      .then((d) => setResult({ key: fetchKey, data: d.error ? null : d }))
      .catch(() => setResult({ key: fetchKey, data: null }));
  }, [fetchKey, candidate?.years_exp_claimed, candidate?.location]);

  if (!candidate?.years_exp_claimed) {
    return (
      <div className="view-enter max-w-3xl space-y-6">
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          SALARY ENGINE
        </h1>
        <div className="panel p-8 text-center">
          <p className="kicker">
            SET YOUR YEARS OF EXPERIENCE IN YOUR PROFILE TO SEE YOUR MARKET SALARY POSITION.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-enter max-w-3xl space-y-6">
      <div>
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          SALARY ENGINE
        </h1>
        <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
          SINGAPORE TECH MARKET · DEGREE-2 REGRESSION MODEL
        </p>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">MARKET SALARY CURVE</span>
          {salaryData && (
            <span className="badge badge-up">
              YOUR POSITION: {formatPercentile(salaryData.candidate_percentile)}
            </span>
          )}
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex h-52 items-center justify-center">
              <p className="kicker animate-pulse">COMPUTING REGRESSION...</p>
            </div>
          ) : salaryData ? (
            <SalaryCurve
              curve={salaryData.curve}
              candYears={candidate.years_exp_claimed ?? undefined}
              candMin={candidate.desired_salary_min ?? undefined}
              height={260}
            />
          ) : (
            <div className="flex h-52 items-center justify-center">
              <p className="kicker">NO SALARY DATA AVAILABLE</p>
            </div>
          )}
        </div>
      </div>

      {salaryData && (
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">YOUR MARKET POSITION</span>
          </div>
          <div className="px-4">
            <DataRow
              label="MARKET MEDIAN (YOUR EXP)"
              value={formatSalary(salaryData.median_at_exp)}
              color="up"
            />
            <DataRow
              label="YOUR PERCENTILE"
              value={formatPercentile(salaryData.candidate_percentile)}
              color="gold"
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
        </div>
      )}

      {salaryData && (
        <div className="panel p-4">
          <p className="mono" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
            <span className="kicker" style={{ color: "var(--up)" }}>
              MARGINAL VALUE:
            </span>{" "}
            Based on the regression curve, each additional year of experience at your level is
            worth approximately{" "}
            <span style={{ color: "var(--text)" }}>
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

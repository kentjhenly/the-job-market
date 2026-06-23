import { unstable_cache } from "next/cache";

// The employer terminal recomputes candidate-matcher rankings for up
// to 10 postings and salary-regression fits for the top 3 candidates on every
// load — up to 13 edge-function calls per visit, the heaviest page in the app.
// Both outputs shift slowly (rankings only as candidates edit portfolios or
// matches accept; regression only as new match data points land), so cache
// them for 60s. The summary panels tolerate up to a minute of staleness, and
// the live per-posting view (/employer/postings/[postingId]) stays uncached.

const CACHE_TTL_SECONDS = 60;

type MatcherMatch = {
  candidate_id: string;
  candidate_posting_id: string;
  match_score: number;
  match_percentile: number;
};

export const getCachedPostingMatches = unstable_cache(
  async (postingId: string): Promise<MatcherMatch[]> => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/candidate-matcher`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ posting_id: postingId }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.matches ?? []) as MatcherMatch[];
  },
  ["terminal-candidate-matcher"],
  { revalidate: CACHE_TTL_SECONDS }
);

export type SalaryRegressionResult = {
  curve?: Array<{ years_exp: number; p25: number; p50: number; p75: number; p90: number }>;
  n_points?: number;
  points?: unknown[];
  candidate_percentile?: number;
  marginal_per_year?: number;
};

export const getCachedSalaryRegression = unstable_cache(
  async (body: Record<string, unknown>): Promise<SalaryRegressionResult | null> => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/salary-regression`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) return null;
    return (await res.json()) as SalaryRegressionResult;
  },
  ["terminal-salary-regression"],
  { revalidate: CACHE_TTL_SECONDS }
);

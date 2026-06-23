import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RegressionInput {
  vertical?: string;
  years_exp: number;
  location?: string;
  remote?: boolean;
  role?: string;
  current_salary?: number;
}

// Shrinkage half-trust point: at n = SHRINK_K the quadratic term is trusted 50%
// (s = n/(n+K) => s(15)=0.5). Small n shrinks curvature toward 0 (near-linear);
// large n approaches the full quadratic. Continuous, so no jump at any n.
const SHRINK_K = 15;
// Log-space residual SD used for quantile bands when the sample is too thin to
// estimate one (n < 5). exp(0.30) ≈ 1.35, a defensible within-cohort dispersion.
const DEFAULT_LOG_SIGMA = 0.3;
// Standard-normal z-scores for the parametric band (p25 / p75 / p90).
const Z25 = -0.6745;
const Z75 = 0.6745;
const Z90 = 1.2816;

// ---- pure-Deno linear algebra ----------------------------------------------

function feat(x: number, degree: number): number[] {
  return degree === 2 ? [1, x, x * x] : [1, x];
}

function solveLinear(A: number[][], y: number[]): number[] | null {
  const k = y.length;
  const M = A.map((row, i) => [...row, y[i]]);
  for (let col = 0; col < k; col++) {
    let pivot = col;
    for (let r = col + 1; r < k; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = col + 1; r < k; r++) {
      const factor = M[r][col] / M[col][col];
      for (let c = col; c <= k; c++) M[r][c] -= factor * M[col][c];
    }
  }
  const b = new Array(k).fill(0);
  for (let i = k - 1; i >= 0; i--) {
    let v = M[i][k];
    for (let j = i + 1; j < k; j++) v -= M[i][j] * b[j];
    b[i] = v / M[i][i];
  }
  return b;
}

// Ordinary least squares fit of `ys` on poly(x, degree).
function fitOLS(xs: number[], ys: number[], degree: number): number[] {
  const k = degree + 1;
  const ATA = Array.from({ length: k }, () => new Array(k).fill(0));
  const ATy = new Array(k).fill(0);
  for (let i = 0; i < xs.length; i++) {
    const f = feat(xs[i], degree);
    for (let r = 0; r < k; r++) {
      ATy[r] += f[r] * ys[i];
      for (let c = 0; c < k; c++) ATA[r][c] += f[r] * f[c];
    }
  }
  const sol = solveLinear(ATA, ATy);
  if (sol) return sol;
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  return degree === 2 ? [mean, 0, 0] : [mean, 0];
}

function quantileOf(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST" },
    });
  }

  // Service-role-only. The gateway's default verify_jwt accepts the public anon
  // key (shipped in the browser bundle), so we also require the service-role key
  // here; config.toml sets verify_jwt = false to skip the redundant gateway check.
  if (req.headers.get("Authorization") !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const input: RegressionInput = await req.json();
  const { vertical, years_exp, location, remote, role } = input;

  if (years_exp == null) {
    return new Response(JSON.stringify({ error: "years_exp required" }), { status: 400 });
  }

  // Cascade from most to least specific until enough points are found:
  // role(+location) → vertical(+location) → overall market(+location).
  // The location filter is dropped within each level before falling to
  // the next, so a candidate outside the seeded market still gets a curve.
  type Level = "role" | "vertical" | "all";
  const attempts: { level: Level; byLocation: boolean }[] = [];
  for (const level of ["role", "vertical", "all"] as Level[]) {
    if (level === "role" && !role) continue;
    if (level === "vertical" && !vertical) continue;
    if (location) attempts.push({ level, byLocation: true });
    attempts.push({ level, byLocation: false });
  }

  let dataPoints: { years_exp: number; monthly_salary: number; source: string }[] | null = null;

  for (const attempt of attempts) {
    const base = () => {
      let query = supabase
        .from("salary_data_points")
        .select("years_exp, monthly_salary, source");

      if (attempt.level === "role") query = query.eq("role_label", role);
      if (attempt.level === "vertical") query = query.eq("vertical", vertical);
      if (attempt.byLocation) query = query.eq("location", location);
      if (remote !== undefined) query = query.eq("remote", remote);
      return query;
    };

    // Real match outcomes are rare and must always contribute to the fit,
    // so they're fetched separately — the row cap below would otherwise
    // sample most of them away once the seed dataset outgrows it.
    const [{ data: matchData }, { data: seedData }] = await Promise.all([
      base().eq("source", "match").order("id").limit(500),
      base().neq("source", "match").order("id").limit(1000),
    ]);

    const data = [...(seedData ?? []), ...(matchData ?? [])].filter((d) => d.monthly_salary > 0);
    if (data.length >= 3) {
      dataPoints = data;
      break;
    }
  }

  if (!dataPoints || dataPoints.length < 3) {
    return new Response(JSON.stringify({ error: "Insufficient data for regression" }), {
      status: 422,
    });
  }

  const n = dataPoints.length;
  const xs = dataPoints.map((d) => d.years_exp);
  const lys = dataPoints.map((d) => Math.log(d.monthly_salary)); // fit in log space
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);

  // 1. Mincer fit in log space: log_salary ≈ b0 + b1*x + b2*x² (b2 < 0 = the
  //    diminishing returns to experience). Fit unconstrained, then ...
  const [, , b2u] = fitOLS(xs, lys, 2);

  // 2. ... shrink the curvature continuously toward 0 by s = n/(n+K), and refit
  //    b0/b1 with the shrunk b2 held fixed (regress the partial residual on [1,x]).
  const s = n / (n + SHRINK_K);
  const b2 = s * b2u;
  const partial = lys.map((ly, i) => ly - b2 * xs[i] * xs[i]);
  const [b0, b1] = fitOLS(xs, partial, 1);

  const q = (u: number) => b0 + b1 * u + b2 * u * u;

  // 4. Monotonicity + extrapolation clamp. Outside [xmin,xmax] the slope is held
  //    constant at the nearest boundary (no runaway curvature); a concave fit is
  //    capped at its vertex; and salary never decreases as experience rises.
  function medianLogMono(t: number): number {
    let baseT = t;
    let ext = 0;
    if (t < xmin) {
      baseT = xmin;
      const slope = b1 + 2 * b2 * xmin;
      ext = slope > 0 ? slope * (t - xmin) : 0;
    } else if (t > xmax) {
      baseT = xmax;
      const slope = b1 + 2 * b2 * xmax;
      ext = slope > 0 ? slope * (t - xmax) : 0;
    }
    if (b2 < 0) {
      const xv = -b1 / (2 * b2); // vertex (peak) of the concave parabola
      if (xv >= xmin && xv <= xmax && baseT > xv) baseT = xv; // hold flat past the peak
    }
    return q(baseT) + ext;
  }

  // Effective (clamped, non-negative) log-space slope of the median at t.
  function slopeLog(t: number): number {
    let sl: number;
    if (t < xmin) sl = b1 + 2 * b2 * xmin;
    else if (t > xmax) sl = b1 + 2 * b2 * xmax;
    else sl = b1 + 2 * b2 * t;
    return Math.max(0, sl);
  }

  // 3. Quantile bands as constant log-space offsets from the median: empirical
  //    residual quantiles when n >= 20, else a normal assumption (sample sigma
  //    if n >= 5, else the documented default). Centered on the residual median
  //    and clamped so quantiles can't cross.
  const resid = dataPoints.map((d) => Math.log(d.monthly_salary) - medianLogMono(d.years_exp));
  let o25: number;
  let o75: number;
  let o90: number;
  if (n >= 20) {
    const rmed = quantileOf(resid, 0.5);
    o25 = quantileOf(resid, 0.25) - rmed;
    o75 = quantileOf(resid, 0.75) - rmed;
    o90 = quantileOf(resid, 0.9) - rmed;
  } else {
    let sigma = DEFAULT_LOG_SIGMA;
    if (n >= 5) {
      const mean = resid.reduce((a, b) => a + b, 0) / n;
      const variance = resid.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(n - 3, 1);
      sigma = Math.sqrt(variance);
    }
    o25 = Z25 * sigma;
    o75 = Z75 * sigma;
    o90 = Z90 * sigma;
  }
  o25 = Math.min(o25, 0);
  o75 = Math.max(o75, 0);
  o90 = Math.max(o90, o75);

  // Build the 0..20yr curve from the monotone median (running max in log space
  // is a final guarantee against any residual non-monotonicity).
  const medLog: number[] = [];
  for (let t = 0; t <= 20; t++) {
    const m = medianLogMono(t);
    medLog.push(t > 0 ? Math.max(m, medLog[t - 1]) : m);
  }
  const curve = medLog.map((m, t) => {
    const nLocal = dataPoints!.filter((d) => Math.abs(d.years_exp - t) <= 1).length;
    const p25 = Math.round(Math.exp(m + o25));
    const p50 = Math.round(Math.exp(m));
    const p75 = Math.round(Math.exp(m + o75));
    const p90 = Math.round(Math.exp(m + o90));
    return {
      years_exp: t,
      p25,
      p50,
      p75,
      p90,
      // Retained aliases so the existing (untouched) charts keep rendering.
      predicted_salary: p50,
      ci_lower: p25,
      ci_upper: p75,
      n_local: nLocal,
    };
  });

  // Candidate-level values from the median model at their exact experience.
  const medianAtExp = Math.exp(medianLogMono(years_exp));
  // Analytic marginal from the shrunk b1/b2 (clamped to the monotone curve):
  // additional monthly HKD per +1yr ≈ median × d(log median)/dx.
  const marginalPerYear = Math.round(medianAtExp * slopeLog(years_exp));

  // Candidate percentile: fraction of nearby (±2yr) points below the candidate's
  // actual salary (when provided), otherwise below the fitted median.
  const refSalary = input.current_salary ?? medianAtExp;
  const nearby = dataPoints.filter((d) => Math.abs(d.years_exp - years_exp) <= 2);
  const belowCount = nearby.filter((d) => d.monthly_salary < refSalary).length;
  const candidatePercentile = nearby.length > 0 ? (belowCount / nearby.length) * 100 : 50;

  // Raw-space residual std around the median — retained for the scatter band.
  const rawResid = dataPoints.map((d) => d.monthly_salary - Math.exp(medianLogMono(d.years_exp)));
  const rawVar = rawResid.reduce((a, r) => a + r * r, 0) / Math.max(rawResid.length - 3, 1);
  const stdDev = Math.sqrt(rawVar);

  // Stride-sample the observations behind the fit (match outcomes prioritized).
  const MAX_POINTS = 200;
  const matchRaw = dataPoints.filter((d) => d.source === "match");
  const otherRaw = dataPoints.filter((d) => d.source !== "match");
  const matchBudget = Math.min(matchRaw.length, Math.floor(MAX_POINTS / 2)) || 1;
  const matchStride = Math.max(1, Math.ceil(matchRaw.length / matchBudget));
  const matchPoints = matchRaw.filter((_, i) => i % matchStride === 0);
  const stride = Math.max(1, Math.ceil(otherRaw.length / Math.max(MAX_POINTS - matchPoints.length, 1)));
  const points = [...otherRaw.filter((_, i) => i % stride === 0), ...matchPoints];

  return new Response(
    JSON.stringify({
      curve,
      points,
      std_dev: Math.round(stdDev),
      candidate_percentile: Math.round(candidatePercentile),
      median_at_exp: Math.round(medianAtExp),
      marginal_per_year: marginalPerYear,
      n_points: n,
      model: "log_quadratic_shrunk",
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});

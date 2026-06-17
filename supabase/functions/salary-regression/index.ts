import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RegressionInput {
  vertical?: string;
  years_exp: number;
  location?: string;
  remote?: boolean;
  role?: string;
}

function fitPolynomialRegression(
  xs: number[],
  ys: number[]
): [number, number, number] {
  // Degree-2 polynomial: y = a*x^2 + b*x + c
  // Solve via normal equations: (X^T X)^-1 X^T y
  const n = xs.length;
  if (n < 3) {
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    return [0, 0, meanY];
  }

  // Build X matrix (n x 3): [x^2, x, 1]
  const s0 = n;
  let s1 = 0,
    s2 = 0,
    s3 = 0,
    s4 = 0;
  let t0 = 0,
    t1 = 0,
    t2 = 0;

  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    s1 += x;
    s2 += x * x;
    s3 += x * x * x;
    s4 += x * x * x * x;
    t0 += y;
    t1 += x * y;
    t2 += x * x * y;
  }

  // Solve 3x3 system [s4 s3 s2; s3 s2 s1; s2 s1 s0] * [a;b;c] = [t2;t1;t0]
  const A = [
    [s4, s3, s2],
    [s3, s2, s1],
    [s2, s1, s0],
  ];
  const B = [t2, t1, t0];

  // Gaussian elimination
  for (let col = 0; col < 3; col++) {
    let maxRow = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    }
    [A[col], A[maxRow]] = [A[maxRow], A[col]];
    [B[col], B[maxRow]] = [B[maxRow], B[col]];

    if (Math.abs(A[col][col]) < 1e-10) continue;

    for (let row = col + 1; row < 3; row++) {
      const factor = A[row][col] / A[col][col];
      B[row] -= factor * B[col];
      for (let k = col; k < 3; k++) {
        A[row][k] -= factor * A[col][k];
      }
    }
  }

  // Back substitution
  const result = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    if (Math.abs(A[i][i]) < 1e-10) {
      result[i] = 0;
      continue;
    }
    result[i] = B[i];
    for (let j = i + 1; j < 3; j++) {
      result[i] -= A[i][j] * result[j];
    }
    result[i] /= A[i][i];
  }

  return [result[0], result[1], result[2]];
}

function predict(a: number, b: number, c: number, x: number): number {
  return Math.max(0, a * x * x + b * x + c);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const input: RegressionInput = await req.json();
  const { vertical, years_exp, location, remote, role } = input;

  if (years_exp == null) {
    return new Response(JSON.stringify({ error: "years_exp required" }), {
      status: 400,
    });
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
      // uuid PK order ≈ random order, so the row cap stays an unbiased
      // sample when the dataset exceeds PostgREST's per-request limit
      base().neq("source", "match").order("id").limit(1000),
    ]);

    const data = [...(seedData ?? []), ...(matchData ?? [])];
    if (data.length >= 3) {
      dataPoints = data;
      break;
    }
  }

  if (!dataPoints || dataPoints.length < 3) {
    return new Response(
      JSON.stringify({ error: "Insufficient data for regression" }),
      { status: 422 }
    );
  }

  const xs = dataPoints.map((d) => d.years_exp);
  const ys = dataPoints.map((d) => d.monthly_salary);

  const [a, b, c] = fitPolynomialRegression(xs, ys);

  // Compute residual standard deviation for confidence interval
  const residuals = xs.map((x, i) => ys[i] - predict(a, b, c, x));
  const variance =
    residuals.reduce((sum, r) => sum + r * r, 0) / Math.max(residuals.length - 3, 1);
  const stdDev = Math.sqrt(variance);

  // Generate curve from 0 to 20 years
  const curve = Array.from({ length: 21 }, (_, exp) => ({
    years_exp: exp,
    predicted_salary: Math.round(predict(a, b, c, exp)),
    ci_lower: Math.round(Math.max(0, predict(a, b, c, exp) - 1.645 * stdDev)),
    ci_upper: Math.round(predict(a, b, c, exp) + 1.645 * stdDev),
  }));

  // Candidate's predicted salary at their experience level
  const candidatePredicted = predict(a, b, c, years_exp);

  // Candidate percentile: what fraction of data points at ±2yr range earn less
  const nearby = dataPoints.filter(
    (d) => Math.abs(d.years_exp - years_exp) <= 2
  );
  const nearbyCount = nearby.length;
  const belowCount = nearby.filter((d) => d.monthly_salary < candidatePredicted).length;
  const candidatePercentile = nearbyCount > 0 ? (belowCount / nearbyCount) * 100 : 50;

  // Return the actual observations behind the fit (stride-sampled so the
  // vertical-level fallback dataset doesn't bloat the payload). Match
  // outcomes are prioritized — included in full up to half the budget so
  // they can never crowd the seed layer out of the scatter entirely (the
  // regression fit above always uses every fetched row regardless).
  const MAX_POINTS = 200;
  const matchRaw = dataPoints.filter((d) => d.source === "match");
  const otherRaw = dataPoints.filter((d) => d.source !== "match");
  const matchBudget = Math.min(matchRaw.length, Math.floor(MAX_POINTS / 2)) || 1;
  const matchStride = Math.max(1, Math.ceil(matchRaw.length / matchBudget));
  const matchPoints = matchRaw.filter((_, i) => i % matchStride === 0);
  const stride = Math.max(
    1,
    Math.ceil(otherRaw.length / Math.max(MAX_POINTS - matchPoints.length, 1))
  );
  const points = [...otherRaw.filter((_, i) => i % stride === 0), ...matchPoints];

  return new Response(
    JSON.stringify({
      curve,
      points,
      std_dev: Math.round(stdDev),
      candidate_percentile: Math.round(candidatePercentile),
      median_at_exp: Math.round(candidatePredicted),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});

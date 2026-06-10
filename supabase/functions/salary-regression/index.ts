import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RegressionInput {
  vertical: string;
  years_exp: number;
  location?: string;
  remote?: boolean;
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
  const { vertical, years_exp, location, remote } = input;

  if (!vertical || years_exp == null) {
    return new Response(JSON.stringify({ error: "vertical and years_exp required" }), {
      status: 400,
    });
  }

  // Fetch salary data
  let query = supabase
    .from("salary_data_points")
    .select("years_exp, annual_salary")
    .eq("vertical", vertical);

  if (location) query = query.eq("location", location);
  if (remote !== undefined) query = query.eq("remote", remote);

  const { data: dataPoints } = await query;

  if (!dataPoints || dataPoints.length < 3) {
    return new Response(
      JSON.stringify({ error: "Insufficient data for regression" }),
      { status: 422 }
    );
  }

  const xs = dataPoints.map((d) => d.years_exp);
  const ys = dataPoints.map((d) => d.annual_salary);

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
  const belowCount = nearby.filter((d) => d.annual_salary < candidatePredicted).length;
  const candidatePercentile = nearbyCount > 0 ? (belowCount / nearbyCount) * 100 : 50;

  return new Response(
    JSON.stringify({
      curve,
      candidate_percentile: Math.round(candidatePercentile),
      median_at_exp: Math.round(candidatePredicted),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});

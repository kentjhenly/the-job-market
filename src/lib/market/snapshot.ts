import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const TALENT_INDEX_SCALE = 25;
const DAY_MS = 86400000;

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);
const pctDelta = (recent: number | null, prior: number | null) =>
  recent != null && prior != null && prior !== 0 ? ((recent - prior) / prior) * 100 : null;

function getTimeWindows() {
  const now = Date.now();
  return {
    fourteenDaysAgo: new Date(now - 14 * DAY_MS).toISOString(),
    thirtyDaysAgo: new Date(now - 30 * DAY_MS).toISOString(),
    sevenDaysAgoMs: now - 7 * DAY_MS,
  };
}

// daily-average index reading, oldest → newest, for the INDEX · 30D graph
function buildIndexSeries(rows: { composite_score: number; recorded_at: string }[], scale: number): number[] {
  const byDay = new Map<string, number[]>();
  for (const r of rows) {
    const day = r.recorded_at.slice(0, 10);
    const scores = byDay.get(day);
    if (scores) scores.push(r.composite_score);
    else byDay.set(day, [r.composite_score]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, scores]) => (scores.reduce((a, b) => a + b, 0) / scores.length) * scale);
}

export interface MarketSnapshot {
  talentIndex: number | null;
  talentIndexDelta: number | null;
  talentIndexSeries: number[];
  avgMatchSalary: number | null;
  avgMatchSalaryDelta: number | null;
  openPitches: number;
  openPitchesDelta: number | null;
  matchRate: number | null;
  matchRateDelta: number | null;
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const supabase = getSupabaseServiceClient();
  const { fourteenDaysAgo, thirtyDaysAgo, sevenDaysAgoMs } = getTimeWindows();

  const [
    { data: visibleScores },
    { data: scoreHistory30 },
    { data: acceptedSalaries },
    { count: openPitches },
    { data: pitchVolume },
    { data: respondedMatches },
  ] = await Promise.all([
    supabase.from("candidates").select("composite_score").eq("is_visible", true),
    supabase.from("score_history").select("composite_score, recorded_at").gte("recorded_at", thirtyDaysAgo),
    supabase
      .from("matches")
      .select("offered_salary, responded_at")
      .eq("status", "accepted")
      .not("offered_salary", "is", null)
      .gte("responded_at", fourteenDaysAgo),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("matches").select("created_at").gte("created_at", fourteenDaysAgo),
    supabase
      .from("matches")
      .select("status, responded_at")
      .not("responded_at", "is", null)
      .gte("responded_at", fourteenDaysAgo),
  ]);

  // TALENT INDEX — live avg composite score across visible candidates, scaled
  // to an index reading; 30D delta + graph from score_history's daily averages.
  const currentAvgScore = avg((visibleScores ?? []).map((c) => c.composite_score));
  const talentIndex = currentAvgScore != null ? currentAvgScore * TALENT_INDEX_SCALE : null;
  const talentIndexSeries = buildIndexSeries(scoreHistory30 ?? [], TALENT_INDEX_SCALE);
  const talentIndexDelta =
    talentIndexSeries.length >= 2
      ? pctDelta(talentIndexSeries[talentIndexSeries.length - 1], talentIndexSeries[0])
      : null;

  // AVG MATCH SALARY — last 7D vs prior 7D, from accepted matches
  const salaryRecent: number[] = [];
  const salaryPrior: number[] = [];
  for (const m of acceptedSalaries ?? []) {
    if (m.offered_salary == null || !m.responded_at) continue;
    (new Date(m.responded_at).getTime() >= sevenDaysAgoMs ? salaryRecent : salaryPrior).push(m.offered_salary);
  }
  const avgMatchSalary = avg(salaryRecent) ?? avg(salaryPrior);
  const avgMatchSalaryDelta = pctDelta(avg(salaryRecent), avg(salaryPrior));

  // OPEN PITCHES — live count; delta = pitch volume trend (last 7D vs prior 7D)
  let pitchRecent = 0;
  let pitchPrior = 0;
  for (const m of pitchVolume ?? []) {
    if (new Date(m.created_at).getTime() >= sevenDaysAgoMs) pitchRecent++;
    else pitchPrior++;
  }
  const openPitchesDelta = pctDelta(pitchRecent, pitchPrior);

  // MATCH RATE — accepted / responded, last 7D vs prior 7D
  let acceptedRecent = 0;
  let respondedRecent = 0;
  let acceptedPrior = 0;
  let respondedPrior = 0;
  for (const m of respondedMatches ?? []) {
    if (!m.responded_at) continue;
    const isRecent = new Date(m.responded_at).getTime() >= sevenDaysAgoMs;
    if (isRecent) {
      respondedRecent++;
      if (m.status === "accepted") acceptedRecent++;
    } else {
      respondedPrior++;
      if (m.status === "accepted") acceptedPrior++;
    }
  }
  const matchRateRecent = respondedRecent > 0 ? (acceptedRecent / respondedRecent) * 100 : null;
  const matchRatePrior = respondedPrior > 0 ? (acceptedPrior / respondedPrior) * 100 : null;
  const matchRate = matchRateRecent ?? matchRatePrior;
  const matchRateDelta = pctDelta(matchRateRecent, matchRatePrior);

  return {
    talentIndex,
    talentIndexDelta,
    talentIndexSeries,
    avgMatchSalary,
    avgMatchSalaryDelta,
    openPitches: openPitches ?? 0,
    openPitchesDelta,
    matchRate,
    matchRateDelta,
  };
}

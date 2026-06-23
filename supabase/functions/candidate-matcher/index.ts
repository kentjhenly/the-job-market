import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEIGHTS = {
  skills: 0.35,
  experience: 0.20,
  salary: 0.15,
  location: 0.10,
  vertical: 0.10,
  composite: 0.10,
};

const MAX_RESULTS = 25;

function skillScore(required: string[], have: string[]): number {
  if (required.length === 0) return 1;
  const haveSet = new Set(have.map((s) => s.toLowerCase()));
  const matched = required.filter((s) => haveSet.has(s.toLowerCase())).length;
  return matched / required.length;
}

function experienceScore(min: number | null, max: number | null, years: number | null): number {
  if (min == null && max == null) return 1;
  if (years == null) return 0.5;
  const lo = min ?? 0;
  const hi = max ?? Infinity;
  if (years >= lo && years <= hi) return 1;
  const dist = years < lo ? lo - years : years - hi;
  return Math.max(0, 1 - dist / 5);
}

function salaryScore(
  postMin: number | null,
  postMax: number | null,
  candMin: number | null,
  candMax: number | null
): number {
  if (postMin == null && postMax == null) return 1;
  if (candMin == null && candMax == null) return 0.5;
  const pLo = postMin ?? 0;
  const pHi = postMax ?? Infinity;
  const cLo = candMin ?? 0;
  const cHi = candMax ?? Infinity;
  const overlapLo = Math.max(pLo, cLo);
  const overlapHi = Math.min(pHi, cHi);
  if (overlapHi >= overlapLo) return 1;
  const gap = overlapLo - overlapHi;
  const range = (isFinite(pHi) ? pHi : cHi) - pLo || 1;
  return Math.max(0, 1 - gap / range);
}

function locationScore(
  postLocation: string | null,
  postModes: string[],
  candLocation: string | null,
  candModes: string[]
): number {
  if (postModes.includes("remote") && candModes.includes("remote")) return 1;
  if (postLocation && candLocation && postLocation.trim().toLowerCase() === candLocation.trim().toLowerCase()) {
    return 1;
  }
  if (postModes.some((m) => candModes.includes(m))) return 0.6;
  if (!postLocation || !candLocation) return 0.5;
  return 0.2;
}

function verticalScore(postVertical: string, candVertical: string | null): number {
  if (!candVertical) return 0.5;
  return candVertical === postVertical ? 1 : 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST" },
    });
  }

  // Service-role-only. This function reads candidate data with the service key,
  // so it must be reachable only server-to-server. The gateway's default
  // verify_jwt accepts the public anon key (shipped in the browser bundle), so
  // we also require the service-role key here; config.toml sets verify_jwt =
  // false to skip the now-redundant gateway check.
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

  const { posting_id } = await req.json();
  if (!posting_id) {
    return new Response(JSON.stringify({ error: "posting_id required" }), { status: 400 });
  }

  const { data: posting, error: postingError } = await supabase
    .from("employer_job_postings")
    .select("*")
    .eq("id", posting_id)
    .single();

  if (postingError || !posting) {
    return new Response(JSON.stringify({ error: "Posting not found" }), { status: 404 });
  }

  const { data: candidatePostings, error: candidateError } = await supabase
    .from("candidate_job_postings")
    .select(
      "id, candidate_id, title, location, work_modes, desired_salary_min, desired_salary_max, skills, candidates(composite_score, percentile_rank, years_exp_claimed, is_visible, profiles(display_name, vertical))"
    );

  if (candidateError) {
    return new Response(JSON.stringify({ error: candidateError.message }), { status: 500 });
  }

  type CandidateInfo = {
    composite_score: number;
    percentile_rank: number;
    years_exp_claimed: number | null;
    is_visible: boolean;
    profiles: { display_name: string; vertical: string | null } | null;
  };
  type CandidatePosting = {
    id: string;
    candidate_id: string;
    title: string;
    location: string | null;
    work_modes: string[];
    desired_salary_min: number | null;
    desired_salary_max: number | null;
    skills: string[];
    candidates: CandidateInfo | null;
  };

  const matches = ((candidatePostings ?? []) as unknown as CandidatePosting[])
    .filter((cp) => cp.candidates?.is_visible)
    .map((cp) => {
      const cand = cp.candidates!;
      const breakdown = {
        skills: skillScore(posting.skills, cp.skills),
        experience: experienceScore(posting.years_exp_min, posting.years_exp_max, cand.years_exp_claimed),
        salary: salaryScore(posting.salary_min, posting.salary_max, cp.desired_salary_min, cp.desired_salary_max),
        // Location is irrelevant when the employer hires remote
        location: posting.work_modes.includes("remote")
          ? 1
          : locationScore(posting.location, posting.work_modes, cp.location, cp.work_modes),
        vertical: verticalScore(posting.vertical, cand.profiles?.vertical ?? null),
        composite: (cand.composite_score ?? 0) / 100,
      };

      const match_score = Math.round(
        (breakdown.skills * WEIGHTS.skills +
          breakdown.experience * WEIGHTS.experience +
          breakdown.salary * WEIGHTS.salary +
          breakdown.location * WEIGHTS.location +
          breakdown.vertical * WEIGHTS.vertical +
          breakdown.composite * WEIGHTS.composite) *
          100
      );

      return {
        candidate_id: cp.candidate_id,
        candidate_posting_id: cp.id,
        display_name: cand.profiles?.display_name ?? null,
        composite_score: cand.composite_score,
        percentile_rank: cand.percentile_rank,
        years_exp_claimed: cand.years_exp_claimed,
        posting_title: cp.title,
        location: cp.location,
        work_modes: cp.work_modes,
        desired_salary_min: cp.desired_salary_min,
        desired_salary_max: cp.desired_salary_max,
        skills: cp.skills,
        match_score,
        breakdown,
      };
    });

  // Compatibility percentile: share of all evaluated candidates this one
  // out-scores for this posting (top = 100, bottom = 0)
  const n = matches.length;
  const ranked = matches
    .map((m) => ({
      ...m,
      match_percentile:
        n > 1
          ? Math.round(
              (matches.filter((o) => o.match_score < m.match_score).length / (n - 1)) * 100
            )
          : 100,
    }))
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, MAX_RESULTS);

  return new Response(JSON.stringify({ matches: ranked }), {
    headers: { "Content-Type": "application/json" },
  });
});

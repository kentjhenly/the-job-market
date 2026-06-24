// Shared server-side validation/normalization for job-posting write routes.
// Bounds numeric fields, caps free text, sanitizes the skills array, and
// validates the enum/reference columns (location, work modes, vertical, status,
// availability date) so a client can't persist negative/absurd salaries,
// oversized payloads, arbitrary JSON in array columns, or values outside the
// allowed sets. The malformed-JSON guard lives in the routes (parseJsonObject).
import { clampText, parseSalaryCents, parseIntInRange, sanitizeSkills } from "./security";
import { MAX_POSTING_SKILLS, MAX_TITLE_LEN, MAX_DESCRIPTION_LEN, COUNTRIES, VERTICALS } from "./constants";
import type { WorkMode, PostingStatus, Vertical } from "@/lib/supabase/types";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_CANDIDATES_CAP = 50;
const MAX_YEARS_EXP = 80;
const WORK_MODE_VALUES = ["full_time", "part_time", "remote", "internship"] as const;

// Parse an optional cents salary field: absent → null, present-but-invalid →
// signals an error so the caller can 400.
function optionalSalary(value: unknown): { ok: true; value: number | null } | { ok: false } {
  if (value == null || value === "") return { ok: true, value: null };
  const parsed = parseSalaryCents(value);
  return parsed == null ? { ok: false } : { ok: true, value: parsed };
}

// Country/territory reference field: null when absent, rejected when not one of
// the known COUNTRIES so arbitrary strings can't be stored.
function optionalCountry(value: unknown): { ok: true; value: string | null } | { ok: false } {
  if (value == null || value === "") return { ok: true, value: null };
  if (typeof value !== "string" || !(COUNTRIES as readonly string[]).includes(value)) return { ok: false };
  return { ok: true, value };
}

// Availability date: null when absent, rejected when not a parseable date.
function optionalDate(value: unknown): { ok: true; value: string | null } | { ok: false } {
  if (value == null || value === "") return { ok: true, value: null };
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return { ok: false };
  return { ok: true, value };
}

// Keep only valid, de-duplicated WorkMode values; drops anything unrecognised so
// the array column can never hold arbitrary JSON.
function normalizeWorkModes(raw: unknown): WorkMode[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: WorkMode[] = [];
  for (const v of raw) {
    if (typeof v === "string" && (WORK_MODE_VALUES as readonly string[]).includes(v) && !seen.has(v)) {
      seen.add(v);
      out.push(v as WorkMode);
    }
  }
  return out;
}

export interface EmployerPostingFields {
  title: string;
  description: string | null;
  vertical: Vertical;
  location: string | null;
  work_modes: WorkMode[];
  status: PostingStatus;
  salary_min: number | null;
  salary_max: number | null;
  skills: string[];
  max_candidates: number;
  years_exp_min: number | null;
  years_exp_max: number | null;
}

export function validateEmployerPosting(body: Record<string, unknown>): ValidationResult<EmployerPostingFields> {
  const title = clampText(body.title, MAX_TITLE_LEN);
  if (!title) return { ok: false, error: "Title is required" };

  if (Array.isArray(body.skills) && body.skills.length > MAX_POSTING_SKILLS) {
    return { ok: false, error: `Maximum of ${MAX_POSTING_SKILLS} skills per posting` };
  }

  const min = optionalSalary(body.salary_min);
  const max = optionalSalary(body.salary_max);
  if (!min.ok || !max.ok) return { ok: false, error: "Invalid salary value" };
  if (min.value != null && max.value != null && min.value > max.value) {
    return { ok: false, error: "Minimum salary cannot exceed maximum" };
  }

  // vertical: absent → default "tech"; present-but-unknown → reject.
  const vertical =
    body.vertical == null || body.vertical === "" ? "tech" : body.vertical;
  if (!(VERTICALS as readonly string[]).includes(vertical as string)) {
    return { ok: false, error: "Invalid industry" };
  }

  const location = optionalCountry(body.location);
  if (!location.ok) return { ok: false, error: "Invalid location" };

  // status: absent → default "open"; present-but-unknown → reject.
  const status = body.status == null || body.status === "" ? "open" : body.status;
  if (status !== "open" && status !== "closed") {
    return { ok: false, error: "Invalid status" };
  }

  return {
    ok: true,
    value: {
      title,
      description: clampText(body.description, MAX_DESCRIPTION_LEN),
      vertical: vertical as Vertical,
      location: location.value,
      work_modes: normalizeWorkModes(body.work_modes),
      status: status as PostingStatus,
      salary_min: min.value,
      salary_max: max.value,
      skills: sanitizeSkills(body.skills, MAX_POSTING_SKILLS),
      max_candidates: parseIntInRange(body.max_candidates, 1, MAX_CANDIDATES_CAP) ?? 5,
      years_exp_min: parseIntInRange(body.years_exp_min, 0, MAX_YEARS_EXP),
      years_exp_max: parseIntInRange(body.years_exp_max, 0, MAX_YEARS_EXP),
    },
  };
}

export interface CandidatePostingFields {
  title: string;
  location: string | null;
  work_modes: WorkMode[];
  available_from: string | null;
  notice_period_days: number | null;
  work_eligible: boolean | null;
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  skills: string[];
  years_exp: number | null;
}

export function validateCandidatePosting(body: Record<string, unknown>): ValidationResult<CandidatePostingFields> {
  const title = clampText(body.title, MAX_TITLE_LEN);
  if (!title) return { ok: false, error: "Title is required" };

  if (Array.isArray(body.skills) && body.skills.length > MAX_POSTING_SKILLS) {
    return { ok: false, error: `Maximum of ${MAX_POSTING_SKILLS} skills per posting` };
  }

  const min = optionalSalary(body.desired_salary_min);
  const max = optionalSalary(body.desired_salary_max);
  if (!min.ok || !max.ok) return { ok: false, error: "Invalid salary value" };
  if (min.value != null && max.value != null && min.value > max.value) {
    return { ok: false, error: "Minimum salary cannot exceed maximum" };
  }

  const location = optionalCountry(body.location);
  if (!location.ok) return { ok: false, error: "Invalid location" };

  const availableFrom = optionalDate(body.available_from);
  if (!availableFrom.ok) return { ok: false, error: "Invalid availability date" };

  const noticePeriodDays = parseIntInRange(body.notice_period_days, 0, 365);

  if (availableFrom.value && noticePeriodDays != null) {
    return { ok: false, error: "Set either availability date or notice period, not both" };
  }

  return {
    ok: true,
    value: {
      title,
      location: location.value,
      work_modes: normalizeWorkModes(body.work_modes),
      available_from: availableFrom.value,
      notice_period_days: noticePeriodDays,
      work_eligible: typeof body.work_eligible === "boolean" ? body.work_eligible : null,
      desired_salary_min: min.value,
      desired_salary_max: max.value,
      skills: sanitizeSkills(body.skills, MAX_POSTING_SKILLS),
      years_exp: parseIntInRange(body.years_exp, 0, MAX_YEARS_EXP),
    },
  };
}

// Shared server-side validation/normalization for job-posting write routes.
// Bounds numeric fields, caps free text, and sanitizes the skills array so a
// client can't persist negative/absurd salaries, oversized payloads, or
// arbitrary JSON in array columns. Enum-backed columns (vertical, status,
// work_modes) are left to the DB to reject.
import { clampText, parseSalaryCents, parseIntInRange, sanitizeSkills } from "./security";
import { MAX_POSTING_SKILLS, MAX_TITLE_LEN, MAX_DESCRIPTION_LEN } from "./constants";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_CANDIDATES_CAP = 50;
const MAX_YEARS_EXP = 80;

// Parse an optional cents salary field: absent → null, present-but-invalid →
// signals an error so the caller can 400.
function optionalSalary(value: unknown): { ok: true; value: number | null } | { ok: false } {
  if (value == null || value === "") return { ok: true, value: null };
  const parsed = parseSalaryCents(value);
  return parsed == null ? { ok: false } : { ok: true, value: parsed };
}

export interface EmployerPostingFields {
  title: string;
  description: string | null;
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

  return {
    ok: true,
    value: {
      title,
      description: clampText(body.description, MAX_DESCRIPTION_LEN),
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

  return {
    ok: true,
    value: {
      title,
      desired_salary_min: min.value,
      desired_salary_max: max.value,
      skills: sanitizeSkills(body.skills, MAX_POSTING_SKILLS),
      years_exp: parseIntInRange(body.years_exp, 0, MAX_YEARS_EXP),
    },
  };
}

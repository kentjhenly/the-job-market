// Shared input-hardening helpers used by Route Handlers.

/**
 * Turn a user-supplied upload filename into a safe object-key segment.
 *
 * User-controlled filenames flow into Supabase Storage keys like
 * `${id}/${file.name}`. Without sanitizing, a name such as `../../other/x`,
 * an absolute path, or one with control characters could escape the intended
 * prefix or produce an ambiguous key. We keep only a basename made of a safe
 * character set, strip leading dots (so we never produce dotfiles / `..`),
 * and bound the length.
 */
export function sanitizeStorageFileName(name: string | null | undefined): string {
  const raw = (name ?? "").toString();
  // Take the basename: drop anything before the last path separator (/ or \).
  const base = raw.split(/[/\\]/).pop() ?? "";
  // Replace any character outside a conservative allowlist, collapse runs of
  // the replacement, and trim leading dots/dashes/underscores.
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._-]+/, "")
    .slice(0, 128);
  return cleaned || "file";
}

/**
 * Validate that a string is a safe http(s) URL suitable for storing and later
 * rendering as an href. Blocks `javascript:`, `data:`, `vbscript:`, etc., which
 * would otherwise become stored XSS when echoed into an anchor's href.
 */
export function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/**
 * Validate a user-entered website field. Accepts a bare host/path (e.g.
 * "example.com", which the UI later prefixes with https://) but, if a scheme is
 * declared, requires it to be http/https — blocking `javascript:`/`data:` etc.
 * that would become stored XSS when rendered as an href to other users.
 */
export function isSafeWebsiteInput(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || v.length > 2048) return false;
  if (/[\s<>"'\\]/.test(v)) return false;
  // If it declares a URI scheme, it must be http(s).
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return isSafeHttpUrl(v);
  return true;
}

/**
 * Coerce arbitrary input to a trimmed string capped at `max` characters, or
 * null when empty/non-string. Prevents unbounded text from being persisted
 * (storage abuse / payload DoS).
 */
export function clampText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/**
 * Parse a value expected to be a non-negative integer amount of cents, within a
 * sane upper bound. Returns null for invalid input so callers can reject it.
 * Max defaults to 100,000,000 cents (HKD 1,000,000/mo) which comfortably covers
 * any realistic monthly salary while rejecting absurd values.
 */
export function parseSalaryCents(value: unknown, max = 100_000_000): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > max) return null;
  return n;
}

/**
 * Coerce a value to an integer within [min, max], or null when absent/invalid.
 * Used for bounded counters like max_candidates and years-of-experience inputs
 * so a client can't submit negative or absurd values.
 */
export function parseIntInRange(value: unknown, min: number, max: number): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  if (i < min || i > max) return null;
  return i;
}

/**
 * Normalize a skills array: keep only non-empty strings, trim + length-cap each,
 * de-duplicate case-insensitively, and bound the total count. Prevents storing
 * arbitrary JSON / oversized entries in the skills column.
 */
export function sanitizeSkills(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const s = item.trim().slice(0, 60);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

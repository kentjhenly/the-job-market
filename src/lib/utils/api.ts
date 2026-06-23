// Shared Route Handler helpers for consistent, non-leaky responses and
// server-side input validation.

import { NextResponse } from "next/server";
import type { ZodType } from "zod";

/**
 * Generic 500 that never leaks DB/internal error detail to the client. The real
 * cause is logged server-side (visible in Vercel logs) under `context` so it
 * stays debuggable. Use this instead of returning a raw Supabase/Postgres
 * `error.message`, which exposes column names, constraint identifiers, and
 * other internals to the caller.
 */
export function serverError(context: string, detail?: unknown): NextResponse {
  console.error(`[${context}]`, detail);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}

type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/**
 * Malformed-JSON guard for routes that validate with their own helpers (e.g.
 * the posting/profile validators). A non-JSON, empty, or non-object body
 * becomes a clean 400 instead of the unhandled 500 that a bare
 * `await request.json()` throws.
 */
export async function parseJsonObject(
  request: Request
): Promise<ParseResult<Record<string, unknown>>> {
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid request body" }, { status: 400 }) };
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, response: NextResponse.json({ error: "Invalid request body" }, { status: 400 }) };
  }
  return { ok: true, data: data as Record<string, unknown> };
}

/**
 * Reads and validates a JSON request body against a Zod schema. Returns the
 * parsed, typed value, or a ready-to-return 400 Response: "Invalid request
 * body" for malformed JSON, or the first schema issue's message for a
 * validation failure. Centralizes the parse + validate step so individual
 * routes never touch `await request.json()` directly.
 */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<ParseResult<T>> {
  const parsed = await parseJsonObject(request);
  if (!parsed.ok) return parsed;
  const result = schema.safeParse(parsed.data);
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? "Invalid request body";
    return { ok: false, response: NextResponse.json({ error: msg }, { status: 400 }) };
  }
  return { ok: true, data: result.data };
}

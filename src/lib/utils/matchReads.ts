import type { Database } from "@/lib/supabase/types";

type MatchesUpdate = Database["public"]["Tables"]["matches"]["Update"];

type ReadableMatch = {
  candidate_id: string;
  employer_id: string;
};

/**
 * Picks which "last read" column on `matches` belongs to the given user, so
 * callers can stamp the *actor's own* read column without ever marking the
 * other participant's activity as read.
 */
export function readColumnFor(
  match: ReadableMatch,
  userId: string
): "candidate_last_read_at" | "employer_last_read_at" {
  return match.candidate_id === userId ? "candidate_last_read_at" : "employer_last_read_at";
}

/**
 * Builds the `matches` update fragment that stamps the actor's own read
 * column. Returned as a discriminated object (no computed key) so it spreads
 * cleanly into Supabase's strictly-typed `.update()` calls.
 */
export function readColumnUpdate(
  match: ReadableMatch,
  userId: string,
  timestamp: string
): Pick<MatchesUpdate, "candidate_last_read_at"> | Pick<MatchesUpdate, "employer_last_read_at"> {
  return readColumnFor(match, userId) === "candidate_last_read_at"
    ? { candidate_last_read_at: timestamp }
    : { employer_last_read_at: timestamp };
}

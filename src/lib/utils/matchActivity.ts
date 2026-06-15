import type { Database } from "@/lib/supabase/types";

type ActivityMatch = Pick<
  Database["public"]["Tables"]["matches"]["Row"],
  "created_at" | "responded_at" | "offer_sent_at" | "hired_at" | "last_message_at"
>;

/**
 * Most recent timestamp across all activity on a match (sent, responded,
 * chat message, offer sent, hired) as a Unix epoch in milliseconds.
 */
export function getLastActivityAt(match: ActivityMatch): number {
  return Math.max(
    new Date(match.created_at).getTime(),
    ...[match.responded_at, match.offer_sent_at, match.last_message_at, match.hired_at]
      .filter((t): t is string => t != null)
      .map((t) => new Date(t).getTime())
  );
}

/** Sorts matches by last-activity recency, most recently active first. */
export function sortByLastActivity<T extends ActivityMatch>(matches: T[]): T[] {
  return [...matches].sort((a, b) => getLastActivityAt(b) - getLastActivityAt(a));
}

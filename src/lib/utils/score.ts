import { SCORE_TIERS } from "./constants";

export function scoreVar(score: number): string {
  if (score >= SCORE_TIERS.gold) return "var(--gold)";
  if (score >= SCORE_TIERS.green) return "var(--up)";
  if (score < SCORE_TIERS.red) return "var(--down)";
  return "var(--muted)";
}

export function scoreBadgeVariant(score: number): "gold" | "up" | "down" | "muted" {
  if (score >= SCORE_TIERS.gold) return "gold";
  if (score >= SCORE_TIERS.green) return "up";
  if (score < SCORE_TIERS.red) return "down";
  return "muted";
}

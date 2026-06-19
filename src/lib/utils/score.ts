// Green = high (≥80), gold = medium (≥50), red = low — applies to both
// composite score and reputation score.
export function scoreVar(score: number): string {
  if (score >= 80) return "var(--up)";
  if (score >= 50) return "var(--gold)";
  return "var(--down)";
}

export function scoreBadgeVariant(score: number): "up" | "gold" | "down" {
  if (score >= 80) return "up";
  if (score >= 50) return "gold";
  return "down";
}

export const repVar = scoreVar;
export const repBadgeVariant = scoreBadgeVariant;

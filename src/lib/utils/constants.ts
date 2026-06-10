export const VERTICALS = ["tech", "finance", "marketing", "design", "ops"] as const;
export type VerticalType = (typeof VERTICALS)[number];

export const SCORE_TIERS = {
  gold: 90,
  green: 60,
  red: 30,
} as const;

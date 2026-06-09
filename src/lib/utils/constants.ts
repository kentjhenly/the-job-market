export const VERTICALS = ["tech", "finance", "marketing", "design", "ops"] as const;
export type VerticalType = (typeof VERTICALS)[number];

export const VERTICAL_LABELS: Record<VerticalType, string> = {
  tech: "TECH",
  finance: "FINANCE",
  marketing: "MARKETING",
  design: "DESIGN",
  ops: "OPS",
};

export const MATCH_EXPIRY_HOURS = 72;

export const SCORE_TIERS = {
  gold: 90,
  green: 60,
  red: 30,
} as const;

export const REPUTATION_WEIGHTS = {
  ghosted: -15,
  responded: 5,
  completed_match: 10,
  salary_undercut: -10,
} as const;

export const SIGNAL_WEIGHTS = {
  challenge_score_avg: 0.4,
  challenge_recency: 0.1,
  challenge_speed: 0.05,
  challenge_breadth: 0.1,
  reputation_score: 0.2,
  response_rate: 0.1,
  profile_completeness: 0.05,
} as const;

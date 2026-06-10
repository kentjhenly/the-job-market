import type { WorkMode } from "@/lib/supabase/types";

export const VERTICALS = ["tech", "finance", "marketing", "design", "ops"] as const;
export type VerticalType = (typeof VERTICALS)[number];

export const SCORE_TIERS = {
  gold: 90,
  green: 60,
  red: 30,
} as const;

export const WORK_MODES: { value: WorkMode; label: string }[] = [
  { value: "full_time", label: "FULL-TIME" },
  { value: "part_time", label: "PART-TIME" },
  { value: "remote", label: "REMOTE" },
  { value: "internship", label: "INTERNSHIP" },
];

export const NOTICE_PERIODS: { value: number; label: string }[] = [
  { value: 0, label: "IMMEDIATE" },
  { value: 14, label: "2 WEEKS" },
  { value: 30, label: "1 MONTH" },
  { value: 60, label: "2 MONTHS" },
  { value: 90, label: "3+ MONTHS" },
];

export const SKILLS: { name: string; vertical: VerticalType }[] = [
  // tech
  { name: "JavaScript", vertical: "tech" },
  { name: "TypeScript", vertical: "tech" },
  { name: "React", vertical: "tech" },
  { name: "Node.js", vertical: "tech" },
  { name: "Python", vertical: "tech" },
  { name: "SQL", vertical: "tech" },
  { name: "Cloud / DevOps", vertical: "tech" },
  { name: "System Design", vertical: "tech" },
  // finance
  { name: "Financial Modeling", vertical: "finance" },
  { name: "Valuation", vertical: "finance" },
  { name: "Accounting", vertical: "finance" },
  { name: "Risk Analysis", vertical: "finance" },
  { name: "Excel / VBA", vertical: "finance" },
  { name: "Bloomberg Terminal", vertical: "finance" },
  // marketing
  { name: "SEO", vertical: "marketing" },
  { name: "Content Strategy", vertical: "marketing" },
  { name: "Paid Acquisition", vertical: "marketing" },
  { name: "Marketing Analytics", vertical: "marketing" },
  { name: "Brand Strategy", vertical: "marketing" },
  { name: "Copywriting", vertical: "marketing" },
  // design
  { name: "UI Design", vertical: "design" },
  { name: "UX Research", vertical: "design" },
  { name: "Figma", vertical: "design" },
  { name: "Design Systems", vertical: "design" },
  { name: "Prototyping", vertical: "design" },
  { name: "Visual Design", vertical: "design" },
  // ops
  { name: "Project Management", vertical: "ops" },
  { name: "Supply Chain", vertical: "ops" },
  { name: "Process Improvement", vertical: "ops" },
  { name: "Logistics", vertical: "ops" },
  { name: "Vendor Management", vertical: "ops" },
  { name: "Data Analysis", vertical: "ops" },
];

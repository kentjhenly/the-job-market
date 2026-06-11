import type { WorkMode } from "@/lib/supabase/types";

export const VERTICALS = ["tech", "finance", "marketing", "design", "ops"] as const;
export type VerticalType = (typeof VERTICALS)[number];

export const MAX_PORTFOLIO_PROJECTS = 10;

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

export const JOB_ROLES: { title: string; vertical: VerticalType }[] = [
  // tech
  { title: "Fullstack Engineer", vertical: "tech" },
  { title: "Backend Engineer", vertical: "tech" },
  { title: "Mobile Engineer", vertical: "tech" },
  { title: "Senior Frontend Engineer", vertical: "tech" },
  { title: "Data Engineer", vertical: "tech" },
  { title: "ML Engineer", vertical: "tech" },
  { title: "Platform Engineer", vertical: "tech" },
  { title: "Site Reliability Engineer", vertical: "tech" },
  { title: "Security Engineer", vertical: "tech" },
  { title: "Staff Engineer", vertical: "tech" },
  // finance
  { title: "Accountant", vertical: "finance" },
  { title: "Financial Analyst", vertical: "finance" },
  { title: "Compliance Officer", vertical: "finance" },
  { title: "Risk Analyst", vertical: "finance" },
  { title: "Equity Research Analyst", vertical: "finance" },
  { title: "Investment Banking Analyst", vertical: "finance" },
  { title: "Financial Controller", vertical: "finance" },
  { title: "Portfolio Manager", vertical: "finance" },
  // marketing
  { title: "Social Media Manager", vertical: "marketing" },
  { title: "SEO Specialist", vertical: "marketing" },
  { title: "Content Marketing Manager", vertical: "marketing" },
  { title: "Marketing Analyst", vertical: "marketing" },
  { title: "Performance Marketing Manager", vertical: "marketing" },
  { title: "Brand Manager", vertical: "marketing" },
  { title: "Growth Marketing Lead", vertical: "marketing" },
  { title: "Marketing Director", vertical: "marketing" },
  // design
  { title: "Visual Designer", vertical: "design" },
  { title: "UI Designer", vertical: "design" },
  { title: "UX Designer", vertical: "design" },
  { title: "Product Designer", vertical: "design" },
  { title: "UX Researcher", vertical: "design" },
  { title: "Brand Designer", vertical: "design" },
  { title: "Design Systems Lead", vertical: "design" },
  { title: "Design Director", vertical: "design" },
  // ops
  { title: "Logistics Coordinator", vertical: "ops" },
  { title: "Operations Analyst", vertical: "ops" },
  { title: "Supply Chain Analyst", vertical: "ops" },
  { title: "Vendor Manager", vertical: "ops" },
  { title: "Project Manager", vertical: "ops" },
  { title: "Process Improvement Manager", vertical: "ops" },
  { title: "Operations Manager", vertical: "ops" },
  { title: "Operations Director", vertical: "ops" },
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

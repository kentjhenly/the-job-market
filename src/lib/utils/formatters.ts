export function formatSalary(cents: number, currency = "HKD"): string {
  const amount = cents / 100;
  if (amount >= 1000) {
    return `${currency} ${(amount / 1000).toFixed(0)}K`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

export function formatSalaryBand(minCents: number, maxCents: number, currency = "HKD"): string {
  return `${formatSalary(minCents, currency)}–${formatSalary(maxCents, currency)}`;
}

export function formatPercentile(percentile: number): string {
  const rounded = Math.round(percentile);
  const suffix =
    rounded === 1 ? "st" : rounded === 2 ? "nd" : rounded === 3 ? "rd" : "th";
  return `${rounded}${suffix} percentile`;
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}

export function formatShortDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase();
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function formatTimeRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

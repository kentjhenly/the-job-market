const SALARY_SOURCES_TOOLTIP =
  "Modeled estimate, not a guarantee. Seed curve calibrated to the C&SD 2025 Annual Earnings and Hours Survey, Morgan McKinley HK Salary Guide 2026, JobsDB employer-disclosed ranges, and PayScale/Glassdoor/ERI/Indeed 2025-26, blended with real accepted-match outcomes on this platform as they accrue.";

// Shared label for any panel rendering /api/salary regression output
// (SalaryCurve / SalaryScatter), see CLAUDE.md Salary Data Flow.
export function SalaryEstimateFootnote({ className = "" }: { className?: string }) {
  return (
    <div className={`mt-3 flex flex-col items-start gap-1 ${className}`}>
      <span className="kicker" style={{ fontSize: 9, color: "var(--dim)" }}>
        MODELED ESTIMATE
      </span>
      <p
        className="mono text-left"
        style={{ fontSize: 8.5, color: "var(--dim)", letterSpacing: "0.03em", cursor: "help" }}
        title={SALARY_SOURCES_TOOLTIP}
      >
        SOURCES: C&amp;SD 2025 SURVEY · MORGAN MCKINLEY · JOBSDB · PAYSCALE <span style={{ textDecoration: "underline dotted" }}>ⓘ</span>
      </p>
    </div>
  );
}

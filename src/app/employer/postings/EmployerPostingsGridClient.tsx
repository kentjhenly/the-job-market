"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { SkillBadges } from "@/components/ui/SkillBadges";
import { WORK_MODES } from "@/lib/utils/constants";
import { formatSalary, formatSalaryBand } from "@/lib/utils/formatters";
import type { Database } from "@/lib/supabase/types";

type EmployerPosting = Database["public"]["Tables"]["employer_job_postings"]["Row"];

interface Props {
  initialPostings: EmployerPosting[];
}

export function EmployerPostingsGridClient({ initialPostings }: Props) {
  function salaryLabel(posting: EmployerPosting) {
    if (posting.salary_min != null && posting.salary_max != null) {
      return formatSalaryBand(posting.salary_min, posting.salary_max);
    }
    if (posting.salary_min != null) return `${formatSalary(posting.salary_min)}+`;
    if (posting.salary_max != null) return `UP TO ${formatSalary(posting.salary_max)}`;
    return "SALARY NOT SET";
  }

  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      {initialPostings.map((posting) => {
        return (
          <Link
            key={posting.id}
            href={`/employer/postings/${posting.id}`}
            className="panel flex min-h-[220px] flex-col gap-3 p-4 transition-colors hover:border-(--border-strong)"
          >
            <div>
              <p className="mono" style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>
                {posting.title}
              </p>
              <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
                {posting.location ?? "LOCATION NOT SET"} · {posting.vertical.toUpperCase()}
              </p>
            </div>

            <p className="mono tnum" style={{ fontSize: 12, color: "var(--up)" }}>
              {salaryLabel(posting)}
            </p>

            {posting.work_modes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {posting.work_modes.map((mode) => (
                  <Badge key={mode} variant="muted">
                    {WORK_MODES.find((w) => w.value === mode)?.label ?? mode}
                  </Badge>
                ))}
              </div>
            )}

            <SkillBadges skills={posting.skills} />
          </Link>
        );
      })}

      <Link
        href="/employer/postings/new"
        className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-4 transition-colors hover:border-(--border-strong)"
        style={{
          border: "1px dashed var(--border-strong)",
          borderRadius: "var(--r-lg)",
        }}
      >
        <span style={{ fontSize: 28, color: "var(--muted)", lineHeight: 1 }}>+</span>
        <span className="kicker">CREATE OPENING</span>
      </Link>
    </div>
  );
}

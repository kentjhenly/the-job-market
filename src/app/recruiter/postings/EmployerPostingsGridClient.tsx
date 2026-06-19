"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
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
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {initialPostings.map((posting) => {
        const visibleSkills = posting.skills.slice(0, 3);
        const extraSkills = posting.skills.length - visibleSkills.length;

        return (
          <Link
            key={posting.id}
            href={`/recruiter/postings/${posting.id}`}
            className="panel flex aspect-square flex-col justify-between p-4 transition-colors hover:border-(--border-strong)"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="mono" style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>
                  {posting.title}
                </p>
                {posting.work_modes.slice(0, 1).map((mode) => (
                  <Badge key={mode} variant="muted">
                    {WORK_MODES.find((w) => w.value === mode)?.label ?? mode}
                  </Badge>
                ))}
              </div>

              <p className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                {posting.location ?? "LOCATION NOT SET"} · {posting.vertical.toUpperCase()}
              </p>

              <p className="mono tnum" style={{ fontSize: 12, color: "var(--up)" }}>
                {salaryLabel(posting)}
              </p>
            </div>

            {posting.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {visibleSkills.map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
                {extraSkills > 0 && <Badge variant="outline">+{extraSkills} MORE</Badge>}
              </div>
            )}
          </Link>
        );
      })}

      <Link
        href="/recruiter/postings/new"
        className="flex aspect-square flex-col items-center justify-center gap-2 p-4 transition-colors hover:border-(--border-strong)"
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

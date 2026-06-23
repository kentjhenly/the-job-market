"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { SkillBadges } from "@/components/ui/SkillBadges";
import { WORK_MODES } from "@/lib/utils/constants";
import { formatSalaryBand } from "@/lib/utils/formatters";
import type { Database } from "@/lib/supabase/types";

type JobPosting = Database["public"]["Tables"]["candidate_job_postings"]["Row"];

const MAX_POSTINGS = 10;

export function PostingsGridClient({ initialPostings }: { initialPostings: JobPosting[] }) {
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      {initialPostings.map((posting) => {
        const availableLabel = posting.available_from
          ? posting.available_from <= todayISO
            ? "IMMEDIATELY"
            : `FROM ${posting.available_from}`
          : null;
        return (
          <Link
            key={posting.id}
            href={`/candidate/postings/${posting.id}`}
            className="panel flex min-h-[220px] flex-col gap-3 p-4 transition-colors hover:border-(--border-strong)"
          >
            <div>
              <p className="mono" style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>
                {posting.title}
              </p>
              <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
                {posting.location ?? "LOCATION NOT SET"}
                {availableLabel ? ` · ${availableLabel}` : ""}
              </p>
            </div>

            <p className="mono tnum" style={{ fontSize: 12, color: "var(--up)" }}>
              {posting.desired_salary_min != null && posting.desired_salary_max != null
                ? formatSalaryBand(posting.desired_salary_min, posting.desired_salary_max)
                : "SALARY NOT SET"}
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

      {initialPostings.length < MAX_POSTINGS && (
        <Link
          href="/candidate/postings/new"
          className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-4 transition-colors hover:border-(--border-strong)"
          style={{
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--r-lg)",
          }}
        >
          <span style={{ fontSize: 28, color: "var(--muted)", lineHeight: 1 }}>+</span>
          <span className="kicker">CREATE POSTING</span>
        </Link>
      )}
    </div>
  );
}

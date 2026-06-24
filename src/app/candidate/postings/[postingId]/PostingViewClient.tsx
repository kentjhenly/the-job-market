"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataRow } from "@/components/terminal/DataRow";
import { formatSalaryBand } from "@/lib/utils/formatters";
import { WORK_MODES, NOTICE_PERIODS } from "@/lib/utils/constants";
import type { Database } from "@/lib/supabase/types";

type JobPosting = Database["public"]["Tables"]["candidate_job_postings"]["Row"];

interface Props {
  posting: JobPosting;
}

export function PostingViewClient({ posting }: Props) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    const res = await fetch(`/api/postings/${posting.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) router.push("/candidate/postings");
  }

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const availableLabel = posting.available_from
    ? posting.available_from <= todayISO
      ? "IMMEDIATELY"
      : posting.available_from
    : null;

  return (
    <>
      <div className="view-enter space-y-4">
        <div>
          <Link href="/candidate/postings" className="link-up mono" style={{ fontSize: 11 }}>
            ← BACK TO POSTINGS
          </Link>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">{posting.title}</span>
          </div>
          <div className="space-y-1 px-4 pb-4">
            <DataRow label="LOCATION" value={posting.location?.toUpperCase() ?? "NOT SET"} />
            {posting.desired_salary_min != null && posting.desired_salary_max != null && (
              <DataRow
                label="DESIRED SALARY"
                value={formatSalaryBand(posting.desired_salary_min, posting.desired_salary_max)}
                color="up"
              />
            )}
            {posting.years_exp != null && (
              <DataRow label="EXPERIENCE" value={`${posting.years_exp} YEARS`} />
            )}
            {availableLabel && <DataRow label="AVAILABLE" value={availableLabel} />}
            {posting.notice_period_days != null && (
              <DataRow
                label="NOTICE PERIOD"
                value={NOTICE_PERIODS.find((np) => np.value === posting.notice_period_days)?.label ?? `${posting.notice_period_days} DAYS`}
              />
            )}
            {posting.work_eligible != null && (
              <DataRow
                label="WORK ELIGIBLE"
                value={posting.work_eligible ? "YES" : "NO"}
                color={posting.work_eligible ? "up" : "down"}
              />
            )}
          </div>
          {posting.work_modes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-4">
              {posting.work_modes.map((mode) => (
                <Badge key={mode} variant="muted">
                  {WORK_MODES.find((w) => w.value === mode)?.label ?? mode}
                </Badge>
              ))}
            </div>
          )}
          {posting.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-4">
              {posting.skills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center">
          <Link href={`/candidate/postings/${posting.id}/edit`}>
            <Button>EDIT</Button>
          </Link>
          <Button variant="danger" className="ml-auto" onClick={() => setDeleteOpen(true)}>
            DELETE
          </Button>
        </div>
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="DELETE POSTING">
        <div className="space-y-4">
          <p className="mono" style={{ fontSize: 12, color: "var(--text)" }}>
            Delete &quot;{posting.title}&quot;? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              DELETE
            </Button>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              CANCEL
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

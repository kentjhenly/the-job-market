"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { WORK_MODES } from "@/lib/utils/constants";
import { formatSalaryBand } from "@/lib/utils/formatters";
import type { Database } from "@/lib/supabase/types";

type JobPosting = Database["public"]["Tables"]["candidate_job_postings"]["Row"];

const MAX_POSTINGS = 10;

export function PostingsGridClient({ initialPostings }: { initialPostings: JobPosting[] }) {
  const [postings, setPostings] = useState<JobPosting[]>(initialPostings);
  const [deleteTarget, setDeleteTarget] = useState<JobPosting | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const res = await fetch(`/api/postings/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setPostings((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    }

    setDeleting(false);
    setDeleteTarget(null);
  }

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {postings.map((posting) => {
          const availableLabel = posting.available_from
            ? posting.available_from <= todayISO
              ? "IMMEDIATELY"
              : `FROM ${posting.available_from}`
            : null;
          const visibleSkills = posting.skills.slice(0, 3);
          const extraSkills = posting.skills.length - visibleSkills.length;

          return (
            <div key={posting.id} className="panel flex min-h-[200px] flex-col gap-3 p-4">
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

              <div className="mt-auto flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--border-soft)" }}>
                <Link href={`/candidate/postings/${posting.id}`} className="link-up mono" style={{ fontSize: 11 }}>
                  EDIT
                </Link>
                <button
                  onClick={() => setDeleteTarget(posting)}
                  className="mono"
                  style={{ fontSize: 11, color: "var(--down)" }}
                >
                  DELETE
                </button>
              </div>
            </div>
          );
        })}

        {postings.length < MAX_POSTINGS && (
          <Link
            href="/candidate/postings/new"
            className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-4 transition-colors hover:border-(--border-strong)"
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

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="DELETE POSTING">
        <div className="space-y-4">
          <p className="mono" style={{ fontSize: 12, color: "var(--text)" }}>
            Delete &quot;{deleteTarget?.title}&quot;? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              DELETE
            </Button>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              CANCEL
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

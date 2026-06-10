"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils/cn";
import { WORK_MODES, SKILLS, VERTICALS } from "@/lib/utils/constants";
import type { Database, WorkMode, Vertical, PostingStatus } from "@/lib/supabase/types";

type EmployerPosting = Database["public"]["Tables"]["employer_job_postings"]["Row"];

interface EmployerJobPostingFormProps {
  initial: EmployerPosting | null;
}

export function EmployerJobPostingForm({ initial }: EmployerJobPostingFormProps) {
  const router = useRouter();
  const isEditing = !!initial;

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    vertical: (initial?.vertical ?? "tech") as Vertical,
    years_exp_min: initial?.years_exp_min?.toString() ?? "",
    years_exp_max: initial?.years_exp_max?.toString() ?? "",
    location: initial?.location ?? "",
    work_modes: initial?.work_modes ?? ([] as WorkMode[]),
    salary_min: initial?.salary_min != null ? (initial.salary_min / 100).toString() : "",
    salary_max: initial?.salary_max != null ? (initial.salary_max / 100).toString() : "",
    skills: initial?.skills ?? ([] as string[]),
    max_candidates: initial?.max_candidates ?? 5,
    status: (initial?.status ?? "open") as PostingStatus,
  });
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function toggleWorkMode(mode: WorkMode) {
    setForm((f) => ({
      ...f,
      work_modes: f.work_modes.includes(mode)
        ? f.work_modes.filter((m) => m !== mode)
        : [...f.work_modes, mode],
    }));
  }

  function toggleSkill(skill: string) {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skill)
        ? f.skills.filter((s) => s !== skill)
        : [...f.skills, skill],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body = {
      title: form.title,
      description: form.description || null,
      vertical: form.vertical,
      years_exp_min: form.years_exp_min ? parseInt(form.years_exp_min) : null,
      years_exp_max: form.years_exp_max ? parseInt(form.years_exp_max) : null,
      location: form.location || null,
      work_modes: form.work_modes,
      salary_min: form.salary_min ? Math.round(parseFloat(form.salary_min) * 100) : null,
      salary_max: form.salary_max ? Math.round(parseFloat(form.salary_max) * 100) : null,
      skills: form.skills,
      max_candidates: form.max_candidates,
      status: form.status,
    };

    const res = await fetch(
      isEditing ? `/api/employer-postings/${initial.id}` : "/api/employer-postings",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    setSaving(false);
    if (res.ok) {
      if (isEditing) {
        router.refresh();
      } else {
        const { id } = await res.json();
        router.push(`/employer/postings/${id}`);
      }
    }
  }

  async function confirmDelete() {
    if (!initial) return;
    setDeleting(true);
    const res = await fetch(`/api/employer-postings/${initial.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) router.push("/employer/postings");
  }

  const verticalSkills = SKILLS.filter((s) => s.vertical === form.vertical);

  return (
    <div className="view-enter max-w-2xl space-y-6">
      <div>
        <Link href="/employer/postings" className="link-up mono" style={{ fontSize: 11 }}>
          ← BACK TO POSTINGS
        </Link>
        <h1 className="kicker mt-2" style={{ color: "var(--up)", fontSize: 12 }}>
          {isEditing ? "EDIT JOB POSTING" : "CREATE JOB POSTING"}
        </h1>
      </div>

      <form onSubmit={save} className="space-y-6">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">ROLE</span>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">TITLE / JOB ROLE</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="field"
                placeholder="Senior Frontend Engineer"
                required
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">DESCRIPTION</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="field"
                rows={4}
                placeholder="What this role involves, team context, etc."
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">VERTICAL</label>
              <select
                value={form.vertical}
                onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value as Vertical }))}
                className="field"
              >
                {VERTICALS.map((v) => (
                  <option key={v} value={v}>
                    {v.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">EXPERIENCE</span>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">MIN YEARS</label>
              <input
                type="number"
                min={0}
                value={form.years_exp_min}
                onChange={(e) => setForm((f) => ({ ...f, years_exp_min: e.target.value }))}
                className="field"
                placeholder="2"
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">MAX YEARS</label>
              <input
                type="number"
                min={0}
                value={form.years_exp_max}
                onChange={(e) => setForm((f) => ({ ...f, years_exp_max: e.target.value }))}
                className="field"
                placeholder="6"
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">COMPENSATION (HKD)</span>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">MINIMUM</label>
              <input
                type="number"
                value={form.salary_min}
                onChange={(e) => setForm((f) => ({ ...f, salary_min: e.target.value }))}
                className="field"
                placeholder="80000"
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">MAXIMUM</label>
              <input
                type="number"
                value={form.salary_max}
                onChange={(e) => setForm((f) => ({ ...f, salary_max: e.target.value }))}
                className="field"
                placeholder="120000"
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">LOCATION & WORK MODE</span>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">LOCATION</label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="field"
                placeholder="Hong Kong"
              />
            </div>

            <div>
              <label className="kicker mb-1.5 block">WORK MODES</label>
              <div className="flex flex-wrap gap-2">
                {WORK_MODES.map((mode) => {
                  const selected = form.work_modes.includes(mode.value);
                  return (
                    <button
                      type="button"
                      key={mode.value}
                      onClick={() => toggleWorkMode(mode.value)}
                      className={cn("badge", selected ? "badge-up" : "badge-muted")}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">REQUIRED SKILLS</span>
          </div>
          <div className="space-y-4 p-4">
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.skills.map((skill) => (
                  <Badge key={skill} variant="up">
                    {skill}
                    <button
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      aria-label={`Remove ${skill}`}
                      style={{ marginLeft: 2 }}
                    >
                      ✕
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {verticalSkills.map((skill) => {
                const selected = form.skills.includes(skill.name);
                return (
                  <button
                    type="button"
                    key={skill.name}
                    onClick={() => toggleSkill(skill.name)}
                    className={cn("badge", selected ? "badge-up" : "badge-muted")}
                  >
                    {skill.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">CAPACITY & STATUS</span>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">MAX ACTIVE CANDIDATES</label>
              <input
                type="number"
                min={1}
                value={form.max_candidates}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_candidates: parseInt(e.target.value) || 1 }))
                }
                className="field"
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">STATUS</label>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: "open" }))}
                  className={cn("badge", form.status === "open" ? "badge-up" : "badge-muted")}
                >
                  OPEN
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: "closed" }))}
                  className={cn("badge", form.status === "closed" ? "badge-down" : "badge-muted")}
                >
                  CLOSED
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving}>
            SAVE POSTING
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/employer/postings")}>
            CANCEL
          </Button>
          {isEditing && (
            <Button type="button" variant="danger" className="ml-auto" onClick={() => setDeleteOpen(true)}>
              DELETE
            </Button>
          )}
        </div>
      </form>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="DELETE POSTING">
        <div className="space-y-4">
          <p className="mono" style={{ fontSize: 12, color: "var(--text)" }}>
            Delete &quot;{initial?.title}&quot;? This cannot be undone.
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
    </div>
  );
}

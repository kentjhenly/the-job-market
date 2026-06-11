"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils/cn";
import { SKILLS, VERTICALS } from "@/lib/utils/constants";
import type { Database } from "@/lib/supabase/types";

type PortfolioProject = Database["public"]["Tables"]["candidate_portfolio_projects"]["Row"];

interface PortfolioFormProps {
  initial: PortfolioProject | null;
}

export function PortfolioForm({ initial }: PortfolioFormProps) {
  const router = useRouter();
  const isEditing = !!initial;

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    link_url: initial?.link_url ?? "",
    skills: initial?.skills ?? ([] as string[]),
  });
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

    const formData = new FormData();
    formData.set("title", form.title);
    formData.set("description", form.description);
    formData.set("link_url", form.link_url);
    formData.set("skills", JSON.stringify(form.skills));
    if (file) formData.set("file", file);
    if (removeFile) formData.set("remove_file", "true");

    const res = await fetch(isEditing ? `/api/portfolio/${initial.id}` : "/api/portfolio", {
      method: isEditing ? "PATCH" : "POST",
      body: formData,
    });

    setSaving(false);
    if (res.ok) router.push("/candidate/portfolio");
  }

  async function confirmDelete() {
    if (!initial) return;
    setDeleting(true);
    const res = await fetch(`/api/portfolio/${initial.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) router.push("/candidate/portfolio");
  }

  return (
    <div className="view-enter max-w-2xl space-y-6">
      <div>
        <Link href="/candidate/portfolio" className="link-up mono" style={{ fontSize: 11 }}>
          ← BACK TO PORTFOLIO
        </Link>
        <h1 className="kicker mt-2" style={{ color: "var(--up)", fontSize: 12 }}>
          {isEditing ? "EDIT PROJECT" : "ADD PROJECT"}
        </h1>
      </div>

      <form onSubmit={save} className="space-y-6">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">PROJECT</span>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">TITLE</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="field"
                placeholder="E-commerce checkout redesign"
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
                placeholder="What you built, your role, the outcome..."
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">LINK</span>
          </div>
          <div className="p-4">
            <label className="kicker mb-1.5 block">EXTERNAL URL</label>
            <input
              value={form.link_url}
              onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
              className="field"
              placeholder="https://github.com/you/project"
              type="url"
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">FILE</span>
          </div>
          <div className="space-y-3 p-4">
            {isEditing && initial.file_name && !removeFile && !file && (
              <div className="flex items-center justify-between">
                <span className="mono" style={{ fontSize: 12, color: "var(--text)" }}>
                  📎 {initial.file_name}
                </span>
                <div className="flex items-center gap-3">
                  <a
                    href={`/api/portfolio/${initial.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="link-up mono"
                    style={{ fontSize: 11 }}
                  >
                    VIEW
                  </a>
                  <button
                    type="button"
                    onClick={() => setRemoveFile(true)}
                    className="mono"
                    style={{ fontSize: 11, color: "var(--down)" }}
                  >
                    REMOVE FILE
                  </button>
                </div>
              </div>
            )}

            {removeFile && (
              <div className="flex items-center justify-between">
                <span className="mono" style={{ fontSize: 11, color: "var(--down)" }}>
                  FILE WILL BE REMOVED ON SAVE
                </span>
                <button
                  type="button"
                  onClick={() => setRemoveFile(false)}
                  className="link-up mono"
                  style={{ fontSize: 11 }}
                >
                  UNDO
                </button>
              </div>
            )}

            <input
              type="file"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setRemoveFile(false);
              }}
              className="field"
            />
            <p className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              MAX 10MB · IMAGES, PDFS, ZIPS, ETC.
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">SKILLS</span>
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

            {VERTICALS.map((v) => {
              const verticalSkills = SKILLS.filter((s) => s.vertical === v);
              return (
                <div key={v}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="kicker">{v.toUpperCase()}</span>
                  </div>
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
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving}>
            SAVE PROJECT
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/candidate/portfolio")}>
            CANCEL
          </Button>
          {isEditing && (
            <Button type="button" variant="danger" className="ml-auto" onClick={() => setDeleteOpen(true)}>
              DELETE
            </Button>
          )}
        </div>
      </form>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="DELETE PROJECT">
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

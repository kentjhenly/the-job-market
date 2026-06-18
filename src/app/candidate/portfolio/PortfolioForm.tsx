"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SkillPicker } from "@/components/ui/SkillPicker";
import type { Database } from "@/lib/supabase/types";

type PortfolioProject = Omit<
  Database["public"]["Tables"]["candidate_portfolio_projects"]["Row"],
  "file_path"
>;

const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"];

function fileExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isValidUrl(url: string): boolean {
  try {
    return new URL(url).protocol.startsWith("http");
  } catch {
    return false;
  }
}

function ExtBlock({ ext }: { ext: string }) {
  return (
    <div className="flex h-48 w-full items-center justify-center" style={{ background: "var(--bg-deep)" }}>
      <span className="mono" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "0.2em", color: "var(--muted)" }}>
        {ext.toUpperCase() || "FILE"}
      </span>
    </div>
  );
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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

  const filePreviewUrl = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file]
  );

  let preview: React.ReactNode;
  let previewLabel: string;
  if (file) {
    previewLabel = file.name;
    preview = filePreviewUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- local object URL
      <img src={filePreviewUrl} alt={file.name} className="h-48 w-full object-cover" style={{ background: "var(--bg-deep)" }} />
    ) : (
      <ExtBlock ext={fileExt(file.name)} />
    );
  } else if (isEditing && initial?.file_name && !removeFile) {
    previewLabel = initial.file_name;
    preview = IMAGE_EXTS.includes(fileExt(initial.file_name)) ? (
      // eslint-disable-next-line @next/next/no-img-element -- signed-URL redirect
      <img src={`/api/portfolio/${initial.id}/file`} alt={initial.file_name} className="h-48 w-full object-cover" style={{ background: "var(--bg-deep)" }} />
    ) : (
      <ExtBlock ext={fileExt(initial.file_name)} />
    );
  } else if (form.link_url && isValidUrl(form.link_url)) {
    previewLabel = form.link_url;
    preview = (
      // eslint-disable-next-line @next/next/no-img-element -- external screenshot service
      <img
        src={`https://s.wordpress.com/mshots/v1/${encodeURIComponent(form.link_url)}?w=840`}
        alt="Website preview"
        className="h-48 w-full object-cover"
        style={{ background: "var(--bg-deep)" }}
      />
    );
  } else {
    previewLabel = "NO MEDIA";
    preview = (
      <div className="flex h-48 w-full items-center justify-center" style={{ background: "var(--bg-deep)" }}>
        <span className="kicker">NO MEDIA</span>
      </div>
    );
  }

  return (
    <div className="view-enter space-y-6">
      <div>
        <Link href="/candidate/portfolio" className="link-up mono" style={{ fontSize: 11 }}>
          ← BACK TO PORTFOLIO
        </Link>
        <h1 className="mono mt-2" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
          {isEditing ? "EDIT PROJECT" : "ADD PROJECT"}
        </h1>
      </div>

      <form onSubmit={save} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
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
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">PROJECT LINK</span>
            <Badge variant="up">RECOMMENDED</Badge>
          </div>
          <div className="p-4">
            <label className="kicker mb-1.5 block">EXTERNAL URL</label>
            <input
              value={form.link_url}
              onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
              className="field"
              type="url"
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">FILE UPLOAD</span>
            <Badge variant="muted">OPTIONAL</Badge>
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
              ref={fileInputRef}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setRemoveFile(false);
              }}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) {
                  setFile(dropped);
                  setRemoveFile(false);
                }
              }}
              className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md py-8 text-center transition-colors"
              style={{
                border: `1px dashed ${dragOver ? "var(--up)" : "var(--border-strong)"}`,
                background: dragOver ? "var(--up-dim)" : "var(--surface-2)",
              }}
            >
              <span className="mono" style={{ fontSize: 24, lineHeight: 1, color: dragOver ? "var(--up)" : "var(--muted)" }}>
                +
              </span>
              <span className="mono" style={{ fontSize: 12, color: "var(--text-2)", letterSpacing: "0.08em" }}>
                {file ? file.name : "ADD FILE"}
              </span>
              <span className="mono" style={{ fontSize: 10.5, color: "var(--dim)" }}>
                {file ? "CLICK OR DROP TO REPLACE" : "DROP FILES HERE OR CLICK TO BROWSE"}
              </span>
            </div>
            <p className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              MAX 10MB · IMAGES, PDF, DOCX, PPTX, ZIP, ETC.
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">SKILLS</span>
          </div>
          <div className="p-4">
            <SkillPicker selected={form.skills} onToggle={toggleSkill} />
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
        </div>

        <div className="panel overflow-hidden lg:sticky lg:top-6">
          <div className="panel-head">
            <span className="panel-title">PREVIEW</span>
          </div>
          {preview}
          <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <p className="mono truncate" style={{ fontSize: 11, color: "var(--muted)" }}>
              {previewLabel}
            </p>
          </div>
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

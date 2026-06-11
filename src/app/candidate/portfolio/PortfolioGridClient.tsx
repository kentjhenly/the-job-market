"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MAX_PORTFOLIO_PROJECTS } from "@/lib/utils/constants";
import type { Database } from "@/lib/supabase/types";

type PortfolioProject = Database["public"]["Tables"]["candidate_portfolio_projects"]["Row"];

const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"];

function fileExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function linkHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Thumbnail({ project }: { project: PortfolioProject }) {
  const ext = project.file_name ? fileExt(project.file_name) : "";

  if (project.file_path && IMAGE_EXTS.includes(ext)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed-URL redirect, not a static asset
      <img
        src={`/api/portfolio/${project.id}/file`}
        alt={project.title}
        className="h-24 w-full object-cover"
        style={{ background: "var(--bg-deep)" }}
      />
    );
  }

  if (project.file_path && ext) {
    return (
      <div className="flex h-24 w-full items-center justify-center" style={{ background: "var(--bg-deep)" }}>
        <span
          className="mono"
          style={{ fontSize: 17, fontWeight: 600, letterSpacing: "0.2em", color: "var(--muted)" }}
        >
          {ext.toUpperCase()}
        </span>
      </div>
    );
  }

  if (project.link_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external screenshot service
      <img
        src={`https://s.wordpress.com/mshots/v1/${encodeURIComponent(project.link_url)}?w=640`}
        alt={project.title}
        className="h-24 w-full object-cover"
        style={{ background: "var(--bg-deep)" }}
      />
    );
  }

  return (
    <div className="flex h-24 w-full items-center justify-center" style={{ background: "var(--bg-deep)" }}>
      <span className="kicker">NO MEDIA</span>
    </div>
  );
}

export function PortfolioGridClient({ initialProjects }: { initialProjects: PortfolioProject[] }) {
  const [projects, setProjects] = useState<PortfolioProject[]>(initialProjects);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioProject | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const res = await fetch(`/api/portfolio/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    }

    setDeleting(false);
    setDeleteTarget(null);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {projects.map((project) => {
          const visibleSkills = project.skills.slice(0, 3);
          const extraSkills = project.skills.length - visibleSkills.length;

          return (
            <div key={project.id} className="panel flex min-h-[220px] flex-col overflow-hidden">
              <div style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <Thumbnail project={project} />
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <p className="mono" style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>
                    {project.title}
                  </p>
                  {(project.file_name || project.link_url) && (
                    <p className="mono mt-1 truncate" style={{ fontSize: 11, color: "var(--muted)" }}>
                      {project.file_name ?? linkHostname(project.link_url!)}
                    </p>
                  )}
                </div>

                {project.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {visibleSkills.map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                    {extraSkills > 0 && <Badge variant="outline">+{extraSkills} MORE</Badge>}
                  </div>
                )}

                <div
                  className="mt-auto flex items-center justify-between pt-2"
                  style={{ borderTop: "1px solid var(--border-soft)" }}
                >
                  <Link href={`/candidate/portfolio/${project.id}`} className="link-up mono" style={{ fontSize: 11 }}>
                    EDIT
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(project)}
                    className="mono"
                    style={{ fontSize: 11, color: "var(--down)" }}
                  >
                    DELETE
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {projects.length < MAX_PORTFOLIO_PROJECTS && (
          <Link
            href="/candidate/portfolio/new"
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-4 transition-colors hover:border-(--border-strong)"
            style={{
              border: "1px dashed var(--border-strong)",
              borderRadius: "var(--r-lg)",
            }}
          >
            <span style={{ fontSize: 28, color: "var(--muted)", lineHeight: 1 }}>+</span>
            <span className="kicker">CREATE PROJECT</span>
          </Link>
        )}
      </div>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="DELETE PROJECT">
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

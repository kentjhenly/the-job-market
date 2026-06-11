"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MAX_PORTFOLIO_PROJECTS } from "@/lib/utils/constants";
import type { Database } from "@/lib/supabase/types";

type PortfolioProject = Database["public"]["Tables"]["candidate_portfolio_projects"]["Row"];

function linkHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {projects.map((project) => {
          const visibleSkills = project.skills.slice(0, 3);
          const extraSkills = project.skills.length - visibleSkills.length;

          return (
            <div key={project.id} className="panel flex flex-col gap-3 p-4">
              <div>
                <p className="mono" style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>
                  {project.title}
                </p>
                {project.description && (
                  <p
                    className="mono mt-1"
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {project.description}
                  </p>
                )}
              </div>

              {(project.file_name || project.link_url) && (
                <p className="mono" style={{ fontSize: 11, color: "var(--info)" }}>
                  {project.file_name ? `📎 ${project.file_name}` : `🔗 ${linkHostname(project.link_url!)}`}
                </p>
              )}

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

              <div className="mt-auto flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--border-soft)" }}>
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
          );
        })}

        {projects.length < MAX_PORTFOLIO_PROJECTS && (
          <Link
            href="/candidate/portfolio/new"
            className="flex flex-col items-center justify-center gap-2 p-4 transition-colors hover:border-(--border-strong)"
            style={{
              border: "1px dashed var(--border-strong)",
              borderRadius: "var(--r-lg)",
              minHeight: 160,
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

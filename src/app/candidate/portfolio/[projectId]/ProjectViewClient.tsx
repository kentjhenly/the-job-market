"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Database } from "@/lib/supabase/types";
import { isSafeHttpUrl } from "@/lib/utils/security";

type PortfolioProject = Omit<
  Database["public"]["Tables"]["candidate_portfolio_projects"]["Row"],
  "file_path"
>;

function linkHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface Props {
  project: PortfolioProject;
}

export function ProjectViewClient({ project }: Props) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    const res = await fetch(`/api/portfolio/${project.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) router.push("/candidate/portfolio");
  }

  return (
    <>
      <div className="view-enter space-y-4">
        <div>
          <Link href="/candidate/portfolio" className="link-up mono" style={{ fontSize: 11 }}>
            ← BACK TO PORTFOLIO
          </Link>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">{project.title}</span>
            <Link
              href={`/candidate/portfolio/${project.id}/edit`}
              className="mono"
              style={{ fontSize: 11, color: "var(--up)" }}
            >
              EDIT →
            </Link>
          </div>

          {project.file_name && (
            <div className="flex items-center gap-3 px-4 pb-3">
              <Badge variant="muted">{project.file_name.split(".").pop()?.toUpperCase()}</Badge>
              <a
                href={`/api/portfolio/${project.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="mono"
                style={{ fontSize: 11, color: "var(--up)" }}
              >
                {project.file_name} →
              </a>
            </div>
          )}

          {project.link_url && isSafeHttpUrl(project.link_url) && (
            <div className="px-4 pb-3">
              <a
                href={project.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mono"
                style={{ fontSize: 11, color: "var(--up)" }}
              >
                {linkHostname(project.link_url)} →
              </a>
            </div>
          )}

          {project.description && (
            <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <p className="kicker mb-1.5 mt-3">DESCRIPTION</p>
              <p className="mono" style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {project.description}
              </p>
            </div>
          )}

          {project.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-4">
              {project.skills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Link href={`/candidate/portfolio/${project.id}/edit`}>
            <Button>EDIT PROJECT</Button>
          </Link>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            DELETE
          </Button>
        </div>
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="DELETE PROJECT">
        <div className="space-y-4">
          <p className="mono" style={{ fontSize: 12, color: "var(--text)" }}>
            Delete &quot;{project.title}&quot;? This cannot be undone.
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

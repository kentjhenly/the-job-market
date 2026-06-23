"use client";

import Link from "next/link";
import { SkillBadges } from "@/components/ui/SkillBadges";
import { MAX_PORTFOLIO_PROJECTS } from "@/lib/utils/constants";
import type { Database } from "@/lib/supabase/types";

type PortfolioProject = Omit<
  Database["public"]["Tables"]["candidate_portfolio_projects"]["Row"],
  "file_path"
>;

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

  if (IMAGE_EXTS.includes(ext)) {
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

  if (ext) {
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
      <div className="relative h-24 w-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
        <iframe
          src={project.link_url}
          title={project.title}
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{ width: 1280, height: 960, transform: "scale(0.15625)" }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-24 w-full items-center justify-center" style={{ background: "var(--bg-deep)" }}>
      <span className="kicker">NO MEDIA</span>
    </div>
  );
}

export function PortfolioGridClient({ initialProjects }: { initialProjects: PortfolioProject[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      {initialProjects.map((project) => (
        <Link
          key={project.id}
          href={`/candidate/portfolio/${project.id}`}
          className="panel flex min-h-[220px] flex-col overflow-hidden transition-colors hover:border-(--border-strong)"
          style={{ textDecoration: "none" }}
        >
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

            <SkillBadges skills={project.skills} />
          </div>
        </Link>
      ))}

      {initialProjects.length < MAX_PORTFOLIO_PROJECTS && (
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
  );
}

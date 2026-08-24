"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl px-8 py-16">
      {/* Header */}
      <div className="mb-12 flex items-end justify-between border-b border-[var(--color-edge)] pb-6">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[var(--color-signal)]">
            Workspace
          </p>
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Projects
          </h1>
        </div>
        <Link
          href="/projects/new"
          className="bg-[var(--color-signal)] px-5 py-2.5 text-sm font-semibold text-[var(--color-void)] transition hover:brightness-110"
        >
          + New Project
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-20 text-center">
          <p className="font-mono text-sm text-[var(--color-muted)]">
            Loading projects...
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="border border-dashed border-[var(--color-edge)] py-20 text-center">
          <p
            className="mb-2 text-lg font-medium text-[var(--color-ink)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            No projects yet
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            Create your first project to start turning long-form video into
            short-form content.
          </p>
        </div>
      )}

      {/* Project list */}
      {!loading && projects.length > 0 && (
        <div className="flex flex-col gap-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group flex items-center justify-between border border-[var(--color-edge)] bg-[var(--color-panel)] px-6 py-5 transition hover:border-[var(--color-signal)] hover:bg-[var(--color-panel)]/80"
            >
              <div className="min-w-0 flex-1">
                <h2
                  className="truncate text-base font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-signal)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {p.name}
                </h2>
                {p.description && (
                  <p className="mt-1 truncate text-sm text-[var(--color-muted)]">
                    {p.description}
                  </p>
                )}
              </div>
              <div className="ml-6 flex items-center gap-4">
                <span className="font-mono text-xs text-[var(--color-muted)]">
                  {new Date(p.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="border border-[var(--color-signal)] bg-[var(--color-signal-dim)] px-2.5 py-0.5 font-mono text-xs text-[var(--color-signal)]">
                  {p.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-16 border-t border-[var(--color-edge)] pt-6">
        <p className="font-mono text-xs text-[var(--color-muted)]">
          Clipit.ai — local-first AI content factory
        </p>
      </div>
    </main>
  );
}

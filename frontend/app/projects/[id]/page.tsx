"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, use, useRef } from "react";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Video {
  id: string;
  project_id: string;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/* ─── Pipeline stages ─── */
const PIPELINE_STAGES = [
  { key: "uploaded", label: "Uploaded" },
  { key: "transcribed", label: "Transcribed" },
  { key: "analyzed", label: "Analyzed" },
  { key: "clips", label: "Clips" },
  { key: "exported", label: "Exported" },
];

function PipelineBar({ videoCount }: { videoCount: number }) {
  // For now, show "Uploaded" as active if videos exist
  const activeIdx = videoCount > 0 ? 0 : -1;

  return (
    <div className="mb-8 border border-[var(--color-edge)] bg-[var(--color-panel)] p-5">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">
        Pipeline
      </p>
      <div className="flex items-center gap-0">
        {PIPELINE_STAGES.map((stage, i) => {
          const isActive = i <= activeIdx;
          const isCurrent = i === activeIdx;
          return (
            <div key={stage.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-3 w-3 items-center justify-center ${
                    isCurrent
                      ? "bg-[var(--color-signal)] glow-signal"
                      : isActive
                        ? "bg-[var(--color-signal)]"
                        : "bg-[var(--color-edge)]"
                  }`}
                />
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider ${
                    isActive
                      ? "text-[var(--color-signal)]"
                      : "text-[var(--color-muted)]"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div
                  className={`mx-1 mb-4 h-px w-10 ${
                    i < activeIdx
                      ? "bg-[var(--color-signal)]"
                      : "bg-[var(--color-edge)]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      }),
      fetch(`/api/projects/${id}/videos`).then((r) => r.json()),
    ])
      .then(([p, v]) => {
        setProject(p);
        setName(p.name);
        setDescription(p.description);
        setVideos(v.videos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const resp = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (resp.ok) {
        const updated = await resp.json();
        setProject(updated);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/");
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch(`/api/projects/${id}/videos`, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Upload failed");
      }

      const video = await resp.json();
      setVideos((prev) => [video, ...prev]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteVideo(videoId: string) {
    if (!confirm("Delete this video?")) return;
    await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  }

  if (loading) {
    return (
      <main className="px-8 py-16">
        <p className="font-mono text-sm text-[var(--color-muted)]">Loading...</p>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="px-8 py-16">
        <p className="font-mono text-sm text-[var(--color-muted)]">
          Project not found.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-8 py-16">
      {/* Back link */}
      <button
        onClick={() => router.push("/")}
        className="mb-8 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)] transition hover:text-[var(--color-signal)]"
      >
        ← Projects
      </button>

      {/* Project header */}
      {editing ? (
        <div className="mb-8 flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-[var(--color-edge)] bg-[var(--color-panel)] px-4 py-3 text-2xl font-bold text-[var(--color-ink)] focus:border-[var(--color-signal)] focus:outline-none"
            style={{ fontFamily: "var(--font-display)" }}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="border border-[var(--color-edge)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-ink)] focus:border-[var(--color-signal)] focus:outline-none"
          />
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="bg-[var(--color-signal)] px-5 py-2 text-sm font-semibold text-[var(--color-void)] transition hover:brightness-110 disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setName(project.name);
                setDescription(project.description);
              }}
              className="border border-[var(--color-edge)] px-5 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-muted)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1
                className="text-3xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {project.name}
              </h1>
              {project.description && (
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {project.description}
                </p>
              )}
            </div>
            <span className="border border-[var(--color-signal)] bg-[var(--color-signal-dim)] px-2.5 py-0.5 font-mono text-xs text-[var(--color-signal)]">
              {project.status}
            </span>
          </div>

          <div className="mb-6 flex items-center gap-6 border border-[var(--color-edge)] bg-[var(--color-panel)] px-5 py-3.5 font-mono text-xs text-[var(--color-muted)]">
            <span>
              Created{" "}
              {new Date(project.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-[var(--color-edge)]">|</span>
            <span>
              Updated{" "}
              {new Date(project.updated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setEditing(true)}
              className="border border-[var(--color-edge)] px-5 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-muted)]"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="border border-[var(--color-danger)] px-5 py-2 text-sm font-medium text-[var(--color-danger)] transition hover:bg-[var(--color-danger-dim)]"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Pipeline visualization */}
      <PipelineBar videoCount={videos.length} />

      {/* Videos section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Videos
          </h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.avi,.mkv"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-[var(--color-signal)] px-5 py-2 text-sm font-semibold text-[var(--color-void)] transition hover:brightness-110 disabled:opacity-40"
            >
              {uploading ? "Uploading..." : "Upload Video"}
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="mb-4 border border-[var(--color-danger)] bg-[var(--color-danger-dim)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {uploadError}
          </div>
        )}

        {videos.length === 0 ? (
          <div className="border border-dashed border-[var(--color-edge)] py-16 text-center">
            <p
              className="mb-1 text-sm font-medium text-[var(--color-ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              No videos yet
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              Upload your first video to get started.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {videos.map((v) => (
              <div
                key={v.id}
                className="group flex items-center justify-between border border-[var(--color-edge)] bg-[var(--color-panel)] px-5 py-4 transition hover:border-[var(--color-signal)]/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                    {v.original_filename}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-[var(--color-muted)]">
                    {formatFileSize(v.file_size)}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-4">
                  <span className="border border-[var(--color-signal)] bg-[var(--color-signal-dim)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-signal)]">
                    {v.status}
                  </span>
                  <button
                    onClick={() => handleDeleteVideo(v.id)}
                    className="text-xs text-[var(--color-muted)] opacity-0 transition hover:text-[var(--color-danger)] group-hover:opacity-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

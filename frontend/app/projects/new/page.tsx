"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewProject() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const resp = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      if (!resp.ok) {
        throw new Error("Failed to create project");
      }

      const project = await resp.json();
      router.push(`/projects/${project.id}`);
    } catch {
      setError("Could not create project. Is the backend running?");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg px-8 py-16">
      {/* Breadcrumb */}
      <button
        onClick={() => router.push("/")}
        className="mb-8 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)] transition hover:text-[var(--color-signal)]"
      >
        ← Projects
      </button>

      <h1
        className="mb-8 text-3xl font-bold tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        New Project
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block font-mono text-xs uppercase tracking-wider text-[var(--color-muted)]"
          >
            Project Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Video Project"
            required
            className="w-full border border-[var(--color-edge)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] transition focus:border-[var(--color-signal)] focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-2 block font-mono text-xs uppercase tracking-wider text-[var(--color-muted)]"
          >
            Description{" "}
            <span className="text-[var(--color-muted)]/50">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description..."
            rows={3}
            className="w-full border border-[var(--color-edge)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] transition focus:border-[var(--color-signal)] focus:outline-none"
          />
        </div>

        {error && (
          <div className="border border-[var(--color-danger)] bg-[var(--color-danger-dim)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="bg-[var(--color-signal)] px-6 py-2.5 text-sm font-semibold text-[var(--color-void)] transition hover:brightness-110 disabled:opacity-40"
          >
            {saving ? "Creating..." : "Create Project"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="border border-[var(--color-edge)] px-6 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-muted)]"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}

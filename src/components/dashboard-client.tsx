"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Feather,
  KeyRound,
  PenLine,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import { Badge, Button, ConfirmDialog, EmptyState, ProgressBar } from "@/components/ui";
import { TypeIcon } from "@/components/type-icon";
import { PROJECT_STATUSES, projectStatusLabel, projectTypeLabel } from "@/lib/constants";
import { cn, fmt, timeAgo } from "@/lib/utils";

export type DashboardProject = {
  id: string;
  title: string;
  type: string;
  genre: string;
  status: string;
  premise: string;
  targetWordCount: number;
  updatedAt: string;
  words: number;
  chapterCount: number;
  codexCount: number;
};

const STATUS_TONES: Record<string, "stone" | "brass" | "emerald" | "red"> = {
  draft: "stone",
  "in-progress": "brass",
  complete: "emerald",
  shelved: "red",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardClient({
  name,
  projects: initialProjects,
  hasKey,
}: {
  name: string;
  projects: DashboardProject[];
  hasKey: boolean;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [deleting, setDeleting] = useState<DashboardProject | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const totalWords = projects.reduce((a, p) => a + p.words, 0);
  const totalChapters = projects.reduce((a, p) => a + p.chapterCount, 0);

  async function changeStatus(p: DashboardProject, status: string) {
    const prev = projects;
    setProjects((ps) => ps.map((x) => (x.id === p.id ? { ...x, status } : x)));
    try {
      await api(`/api/projects/${p.id}`, { method: "PATCH", body: { status } });
      router.refresh();
    } catch {
      setProjects(prev);
      toast.error("Could not update status.");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    const prev = projects;
    setProjects((ps) => ps.filter((x) => x.id !== deleting.id));
    try {
      await api(`/api/projects/${deleting.id}`, { method: "DELETE" });
      toast.success(`“${deleting.title}” moved to the dustbin.`);
      setDeleting(null);
      router.refresh();
    } catch {
      setProjects(prev);
      toast.error("Could not delete the project.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
            {greeting()}, {name.split(" ")[0]}
          </h1>
          <p className="mt-1.5 text-sm text-faded">
            {projects.length === 0
              ? "Your shelves are empty — for now."
              : `${projects.length} ${projects.length === 1 ? "story" : "stories"} on your shelves · ${fmt(totalWords)} words written`}
          </p>
        </div>
        <Link href="/projects/new">
          <Button size="lg">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </Link>
      </div>

      {!hasKey && !bannerDismissed && (
        <div className="flex items-start gap-3.5 rounded-2xl border border-brass/25 bg-brass/5 p-4.5 animate-fade-up">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brass/30 bg-brass/10">
            <KeyRound className="h-4.5 w-4.5 text-brass" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-cream">Connect your AI provider</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-faded">
              Bring an OpenAI, Anthropic or Gemini API key to unlock story-map generation
              and AI continuations. Keys are encrypted at rest with AES-256-GCM.
            </p>
            <Link href="/settings" className="mt-2 inline-block text-[13px] font-semibold text-brass hover:text-brass-bright">
              Add a key in Settings →
            </Link>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="rounded-md p-1 text-faded hover:bg-lift hover:text-cream"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3 animate-fade-up [animation-delay:60ms]">
          {[
            { icon: BookOpen, label: "Stories on shelves", value: fmt(projects.length) },
            { icon: PenLine, label: "Words written", value: fmt(totalWords) },
            { icon: FileText, label: "Chapters drafted", value: fmt(totalChapters) },
          ].map((s) => (
            <div
              key={s.label}
              className="grain flex items-center gap-4 rounded-2xl border border-hairline bg-card/70 px-5 py-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brass/20 bg-brass/8">
                <s.icon className="h-4.5 w-4.5 text-brass" />
              </div>
              <div>
                <p className="font-display text-2xl leading-none font-semibold text-cream">{s.value}</p>
                <p className="mt-1 text-xs tracking-wide text-faded">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {projects.length === 0 ? (
        <EmptyState
          icon={<Feather className="h-6 w-6" />}
          title="Every library starts with one shelf"
          description="Create your first project — a novel, trilogy, short-story collection or screenplay — and grow it from a single sentence into a full manuscript."
          action={
            <Link href="/projects/new">
              <Button>
                <Sparkles className="h-4 w-4" />
                Start your first story
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <div
              key={p.id}
              onClick={() => router.push(`/projects/${p.id}`)}
              className={cn(
                "grain group flex cursor-pointer flex-col rounded-2xl border border-hairline bg-card/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brass/30 hover:shadow-xl hover:shadow-black/40 animate-fade-up"
              )}
              style={{ animationDelay: `${i * 55}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-faded">
                  <TypeIcon type={p.type} className="text-brass" />
                  <span className="text-[11px] font-medium tracking-wide uppercase">
                    {projectTypeLabel(p.type)}
                  </span>
                </div>
                <select
                  value={p.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => changeStatus(p, e.target.value)}
                  className="cursor-pointer rounded-full border border-hairline bg-lift px-2.5 py-1 text-[11px] font-medium text-stone-300 focus:border-brass/50 focus:outline-none"
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <h3 className="font-display mt-3 text-xl leading-snug font-semibold text-cream transition-colors group-hover:text-brass-bright">
                {p.title}
              </h3>
              {p.genre && (
                <p className="mt-1 text-xs font-medium tracking-wide text-stone-500 uppercase">{p.genre}</p>
              )}
              <p className="mt-2.5 line-clamp-2 min-h-10 text-[13px] leading-relaxed text-faded">
                {p.premise || "No premise yet — open the story map and seed one."}
              </p>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-faded">
                  <span>
                    {fmt(p.words)} of {fmt(p.targetWordCount)} words
                  </span>
                  <span className="font-semibold text-brass">
                    {Math.min(999, Math.round((p.words / Math.max(1, p.targetWordCount)) * 100))}%
                  </span>
                </div>
                <ProgressBar value={p.words} max={p.targetWordCount} />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3.5 text-[11px] text-stone-500">
                <span>
                  {p.chapterCount} chapter{p.chapterCount === 1 ? "" : "s"} · edited {timeAgo(p.updatedAt)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(p);
                    }}
                    className="rounded-md p-1.5 text-stone-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-950/60 hover:text-red-300"
                    title="Delete project"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ArrowRight className="h-4 w-4 text-faded transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brass" />
                </div>
              </div>
            </div>
          ))}

          <Link
            href="/projects/new"
            className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline bg-panel/30 p-5 text-faded transition-colors hover:border-brass/40 hover:text-brass animate-fade-up"
            style={{ animationDelay: `${projects.length * 55}ms` }}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-hairline bg-card">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">New project</span>
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title={`Delete “${deleting?.title}”?`}
        message="This permanently removes the project, its chapters, story map and codex. This cannot be undone."
      />
    </div>
  );
}

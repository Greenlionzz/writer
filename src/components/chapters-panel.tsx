"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, GripVertical, PenLine, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client-api";
import { Button, ConfirmDialog, EmptyState } from "@/components/ui";
import { cn, fmt, timeAgo } from "@/lib/utils";

export type PanelChapter = {
  id: string;
  title: string;
  wordCount: number;
  updatedAt: string;
  version: number;
};

export function ChaptersPanel({
  projectId,
  chapters: initial,
}: {
  projectId: string;
  chapters: PanelChapter[];
}) {
  const router = useRouter();
  const [chapters, setChapters] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleting, setDeleting] = useState<PanelChapter | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  async function addChapter() {
    setAdding(true);
    try {
      const { chapter } = await api<{ chapter: PanelChapter & { updatedAt: string } }>(
        `/api/projects/${projectId}/chapters`,
        { method: "POST", body: {} }
      );
      toast.success("New chapter added.");
      router.push(`/projects/${projectId}/write/${chapter.id}`);
      router.refresh();
    } catch {
      toast.error("Could not add a chapter.");
      setAdding(false);
    }
  }

  async function saveRename(ch: PanelChapter) {
    const title = editTitle.trim();
    setEditingId(null);
    if (!title || title === ch.title) return;
    const prev = chapters;
    setChapters((cs) => cs.map((c) => (c.id === ch.id ? { ...c, title } : c)));
    try {
      await api(`/api/chapters/${ch.id}`, { method: "PATCH", body: { title } });
      router.refresh();
    } catch {
      setChapters(prev);
      toast.error("Could not rename the chapter.");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    const prev = chapters;
    setChapters((cs) => cs.filter((c) => c.id !== deleting.id));
    try {
      await api(`/api/chapters/${deleting.id}`, { method: "DELETE" });
      toast.success("Chapter deleted.");
      setDeleting(null);
      router.refresh();
    } catch {
      setChapters(prev);
      toast.error("Could not delete the chapter.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function drop(toIdx: number) {
    const fromIdx = dragIndex.current;
    dragIndex.current = null;
    setDragOver(null);
    if (fromIdx === null || fromIdx === toIdx) return;
    const next = [...chapters];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const prev = chapters;
    setChapters(next);
    try {
      await api(`/api/projects/${projectId}/chapters/reorder`, {
        method: "POST",
        body: { ids: next.map((c) => c.id) },
      });
      router.refresh();
    } catch {
      setChapters(prev);
      toast.error("Could not reorder chapters.");
    }
  }

  if (chapters.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" />}
        title="The first page is blank"
        description="Add a chapter and start drafting — or grow your story map and promote chapter nodes straight into the manuscript."
        action={
          <Button onClick={addChapter} loading={adding}>
            <Plus className="h-4 w-4" />
            Write chapter one
          </Button>
        }
      />
    );
  }

  return (
    <div className="grain rounded-2xl border border-hairline bg-card/70 animate-fade-up [animation-delay:120ms]">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-faded uppercase">Manuscript</p>
          <p className="mt-0.5 text-[13px] text-stone-500">
            {chapters.length} chapter{chapters.length === 1 ? "" : "s"} · drag to reorder
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={addChapter} loading={adding}>
          <Plus className="h-3.5 w-3.5" />
          Add chapter
        </Button>
      </div>

      <ul className="divide-y divide-hairline">
        {chapters.map((ch, i) => (
          <li
            key={ch.id}
            draggable={editingId !== ch.id}
            onDragStart={() => (dragIndex.current = i)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(i);
            }}
            onDragLeave={() => setDragOver((cur) => (cur === i ? null : cur))}
            onDrop={() => drop(i)}
            className={cn(
              "group flex items-center gap-3 px-4.5 py-3.5 transition-colors",
              dragOver === i ? "bg-brass/5" : "hover:bg-lift/50"
            )}
          >
            <span className="cursor-grab text-stone-600 transition-colors group-hover:text-stone-400 active:cursor-grabbing">
              <GripVertical className="h-4 w-4" />
            </span>
            <span className="w-7 shrink-0 text-center font-display text-sm text-stone-500">
              {String(i + 1).padStart(2, "0")}
            </span>

            {editingId === ch.id ? (
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => saveRename(ch)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename(ch);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-8 flex-1 rounded-md border border-brass/50 bg-black/30 px-2.5 text-sm text-cream focus:outline-none"
              />
            ) : (
              <button
                onClick={() => router.push(`/projects/${projectId}/write/${ch.id}`)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-medium text-stone-100 transition-colors group-hover:text-cream">
                  {ch.title}
                </p>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  {fmt(ch.wordCount)} words · edited {timeAgo(ch.updatedAt)}
                </p>
              </button>
            )}

            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              {editingId === ch.id ? (
                <>
                  <button
                    onClick={() => saveRename(ch)}
                    className="rounded-md p-1.5 text-emerald-300 hover:bg-lift"
                    title="Save"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-md p-1.5 text-stone-400 hover:bg-lift"
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditingId(ch.id);
                      setEditTitle(ch.title);
                    }}
                    className="rounded-md p-1.5 text-stone-400 hover:bg-lift hover:text-cream"
                    title="Rename"
                  >
                    <PenLine className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleting(ch)}
                    className="rounded-md p-1.5 text-stone-400 hover:bg-red-950/60 hover:text-red-300"
                    title="Delete chapter"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title={`Delete “${deleting?.title}”?`}
        message="The chapter text will be lost. Linked story-map nodes will be kept but unlinked."
      />
    </div>
  );
}

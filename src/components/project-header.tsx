"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Download, FileText, Network, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import { Badge, Button, ConfirmDialog, Dialog, Input, Select, Textarea } from "@/components/ui";
import { TypeIcon } from "@/components/type-icon";
import { PROJECT_STATUSES, PROJECT_TYPES, projectTypeLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type HeaderProject = {
  id: string;
  title: string;
  type: string;
  genre: string;
  status: string;
  premise: string;
  targetWordCount: number;
};

export function ProjectHeader({
  project,
  children,
}: {
  project: HeaderProject;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    title: project.title,
    type: project.type,
    genre: project.genre,
    status: project.status,
    premise: project.premise,
    targetWordCount: project.targetWordCount,
  });

  const tabs = [
    { href: `/projects/${project.id}`, label: "Manuscript", icon: FileText, exact: true },
    { href: `/projects/${project.id}/map`, label: "Story Map", icon: Network },
    { href: `/projects/${project.id}/codex`, label: "Codex", icon: BookOpen },
  ];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: {
          title: form.title.trim(),
          type: form.type,
          genre: form.genre.trim(),
          status: form.status,
          premise: form.premise.trim(),
          targetWordCount: Number(form.targetWordCount),
        },
      });
      toast.success("Project saved.");
      setEditOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api(`/api/projects/${project.id}`, { method: "DELETE" });
      toast.success(`“${project.title}” deleted.`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Could not delete the project.");
      setDeleting(false);
    }
  }

  return (
    <div className="mb-6 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-faded">
            <TypeIcon type={project.type} className="text-brass" />
            <span className="text-[11px] font-medium tracking-wider uppercase">
              {projectTypeLabel(project.type)}
            </span>
            {project.genre && (
              <Badge tone="stone" className="normal-case">
                {project.genre}
              </Badge>
            )}
          </div>
          <button
            onClick={() => {
              setForm({
                title: project.title,
                type: project.type,
                genre: project.genre,
                status: project.status,
                premise: project.premise,
                targetWordCount: project.targetWordCount,
              });
              setEditOpen(true);
            }}
            className="group mt-1.5 flex max-w-full items-center gap-2.5 text-left"
            title="Edit project details"
          >
            <h1 className="font-display truncate text-3xl font-semibold tracking-tight text-cream transition-colors group-hover:text-brass-bright sm:text-4xl">
              {project.title}
            </h1>
            <Pencil className="h-4 w-4 shrink-0 text-stone-500 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <a href={`/api/projects/${project.id}/export`} download>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </a>
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-stone-500 hover:text-red-300">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-1 border-b border-hairline">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <button
              key={t.href}
              onClick={() => router.push(t.href)}
              className={cn(
                "relative flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
                active ? "text-cream" : "text-faded hover:text-stone-200"
              )}
            >
              <t.icon className={cn("h-4 w-4", active ? "text-brass" : "")} />
              {t.label}
              {active && (
                <span className="absolute right-2 -bottom-px left-2 h-0.5 rounded-full bg-gradient-to-r from-brass-deep to-brass-bright" />
              )}
            </button>
          );
        })}
        {children && <div className="ml-auto pb-1.5">{children}</div>}
      </div>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Project details" wide>
        <form onSubmit={save} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            maxLength={160}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Form"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Genre"
              value={form.genre}
              onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
              maxLength={80}
            />
            <Input
              label="Target word count"
              type="number"
              min={1000}
              step={1000}
              value={form.targetWordCount}
              onChange={(e) => setForm((f) => ({ ...f, targetWordCount: Number(e.target.value) }))}
            />
          </div>
          <Textarea
            label="Premise"
            rows={3}
            value={form.premise}
            onChange={(e) => setForm((f) => ({ ...f, premise: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={`Delete “${project.title}”?`}
        message="This permanently removes the project, its chapters, story map and codex. This cannot be undone."
      />
    </div>
  );
}

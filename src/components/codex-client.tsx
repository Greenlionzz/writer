"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, MapPin, Milestone, PenLine, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import { Button, ConfirmDialog, Dialog, EmptyState, Select, Textarea, Input } from "@/components/ui";
import { ProjectHeader, type HeaderProject } from "@/components/project-header";
import { CODEX_KINDS, codexKindLabel } from "@/lib/constants";
import { cn, timeAgo } from "@/lib/utils";

export type SerializedEntry = {
  id: string;
  kind: string;
  name: string;
  summary: string;
  content: string;
  updatedAt: string;
};

const KIND_ICONS: Record<string, typeof Users> = {
  character: Users,
  location: MapPin,
  lore: BookMarked,
  plot: Milestone,
};

const KIND_TONES: Record<string, { border: string; text: string; bg: string }> = {
  character: { border: "border-violet-400/25", text: "text-violet-300", bg: "bg-violet-400/10" },
  location: { border: "border-emerald-400/25", text: "text-emerald-300", bg: "bg-emerald-400/10" },
  lore: { border: "border-brass/25", text: "text-brass-bright", bg: "bg-brass/10" },
  plot: { border: "border-sky-400/25", text: "text-sky-300", bg: "bg-sky-400/10" },
};

export function CodexClient({
  project,
  initialEntries,
}: {
  project: HeaderProject;
  initialEntries: SerializedEntry[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedEntry | null>(null);
  const [form, setForm] = useState({ name: "", kind: "character", summary: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<SerializedEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          (filter === "all" || e.kind === filter) &&
          (query.trim() === "" ||
            `${e.name} ${e.summary} ${e.content}`.toLowerCase().includes(query.toLowerCase()))
      ),
    [entries, filter, query]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, SerializedEntry[]>();
    for (const kind of CODEX_KINDS) map.set(kind.id, []);
    for (const e of filtered) map.get(e.kind)?.push(e);
    return map;
  }, [filtered]);

  function openCreate(kind: string) {
    setEditing(null);
    setForm({ name: "", kind: kind === "all" ? "character" : kind, summary: "", content: "" });
    setEditorOpen(true);
  }

  function openEdit(entry: SerializedEntry) {
    setEditing(entry);
    setForm({ name: entry.name, kind: entry.kind, summary: entry.summary, content: entry.content });
    setEditorOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const payload = { ...form, name: form.name.trim(), summary: form.summary.trim() };
        const prev = entries;
        setEntries((es) => es.map((x) => (x.id === editing.id ? { ...x, ...payload } : x)));
        const res = await api<{ entry: SerializedEntry }>(`/api/codex/${editing.id}`, {
          method: "PATCH",
          body: payload,
        });
        setEntries((es) =>
          es.map((x) => (x.id === editing.id ? { ...x, ...res.entry, updatedAt: new Date().toISOString() } : x))
        );
        void prev;
        toast.success("Entry updated.");
      } else {
        const res = await api<{ entry: SerializedEntry }>(`/api/projects/${project.id}/codex`, {
          method: "POST",
          body: { ...form, name: form.name.trim(), summary: form.summary.trim() },
        });
        setEntries((es) => [
          { ...res.entry, updatedAt: new Date().toISOString() },
          ...es,
        ]);
        toast.success(`${codexKindLabel(form.kind).slice(0, -1)} added to the codex.`);
      }
      setEditorOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save the entry.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    const prev = entries;
    setEntries((es) => es.filter((x) => x.id !== deleting.id));
    try {
      await api(`/api/codex/${deleting.id}`, { method: "DELETE" });
      toast.success("Entry removed.");
      setDeleting(null);
    } catch {
      setEntries(prev);
      toast.error("Could not delete the entry.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div>
      <ProjectHeader project={project} />

      {entries.length === 0 ? (
        <EmptyState
          icon={<BookMarked className="h-6 w-6" />}
          title="Your world is unwritten"
          description="The codex holds your characters, locations, lore and plot points. Fabula's AI reads it before every generation, so your canon stays consistent."
          action={
            <Button onClick={() => openCreate("character")}>
              <Plus className="h-4 w-4" />
              Add your first entry
            </Button>
          }
        />
      ) : (
        <>
          {/* Toolbar */}
          <div className="mb-5 flex flex-wrap items-center gap-3 animate-fade-up">
            <div className="flex flex-wrap gap-1.5">
              {[{ id: "all", label: "All" }, ...CODEX_KINDS].map((k) => {
                const count =
                  k.id === "all" ? entries.length : entries.filter((e) => e.kind === k.id).length;
                return (
                  <button
                    key={k.id}
                    onClick={() => setFilter(k.id)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                      filter === k.id
                        ? "border-brass/50 bg-brass/10 text-brass-bright"
                        : "border-hairline bg-card/60 text-faded hover:border-stone-600 hover:text-stone-200"
                    )}
                  >
                    {k.label}
                    <span className="ml-1.5 text-stone-500">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative ml-auto w-full sm:w-60">
              <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the codex…"
                className="h-9 w-full rounded-lg border border-hairline bg-black/30 pr-3 pl-9 text-sm text-cream placeholder:text-stone-500 focus:border-brass/60 focus:outline-none"
              />
            </div>
            <Button size="sm" onClick={() => openCreate(filter)}>
              <Plus className="h-3.5 w-3.5" />
              New entry
            </Button>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="Nothing in this shelf"
              description="No entries match your current filter and search. Try a different shelf or add something new."
              action={
                <Button variant="outline" onClick={() => openCreate(filter)}>
                  <Plus className="h-4 w-4" />
                  Add entry
                </Button>
              }
            />
          ) : (
            <div className="space-y-8">
              {CODEX_KINDS.map((kind) => {
                const list = grouped.get(kind.id) ?? [];
                if (list.length === 0) return null;
                const Icon = KIND_ICONS[kind.id];
                const tone = KIND_TONES[kind.id];
                return (
                  <section key={kind.id} className="animate-fade-up">
                    <div className="mb-3 flex items-center gap-2.5">
                      <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg border", tone.border, tone.bg)}>
                        <Icon className={cn("h-3.5 w-3.5", tone.text)} />
                      </div>
                      <h2 className="font-display text-lg font-semibold text-cream">{kind.label}</h2>
                      <span className="text-xs text-stone-500">{list.length}</span>
                      <button
                        onClick={() => openCreate(kind.id)}
                        className="ml-auto flex items-center gap-1 text-xs font-medium text-faded transition-colors hover:text-brass"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {list.map((entry) => (
                        <article
                          key={entry.id}
                          onClick={() => openEdit(entry)}
                          className={cn(
                            "grain group cursor-pointer rounded-2xl border bg-card/70 p-4.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40",
                            tone.border
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display text-[17px] leading-snug font-semibold text-cream">
                              {entry.name}
                            </h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleting(entry);
                              }}
                              className="rounded-md p-1 text-stone-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-950/60 hover:text-red-300"
                              title="Delete entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {entry.summary && (
                            <p className={cn("mt-1.5 line-clamp-2 text-[13px] leading-relaxed font-medium", tone.text)}>
                              {entry.summary}
                            </p>
                          )}
                          {entry.content && (
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-faded">{entry.content}</p>
                          )}
                          <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5 text-[10.5px] text-stone-500">
                            <span className="flex items-center gap-1">
                              <PenLine className="h-3 w-3" /> edited {timeAgo(entry.updatedAt)}
                            </span>
                            <span className="opacity-0 transition-opacity group-hover:opacity-100">Open →</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create / edit dialog */}
      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? `Edit “${editing.name}”` : "New codex entry"}
        description="Entries are read by the AI during story-map generation and continuations."
        wide
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Mara Voss, the Tidewright…"
              autoFocus
              required
              maxLength={120}
            />
            <Select
              label="Kind"
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
            >
              {CODEX_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label.slice(0, -1)}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            label="Summary — one vivid line"
            rows={2}
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            placeholder="A smuggler captain who owes three debts and keeps two faces."
          />
          <Textarea
            label="Notes & details"
            rows={6}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Appearance, motives, history, relationships, secrets, rules of the world…"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Save changes" : "Add to codex"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title={`Delete “${deleting?.name}”?`}
        message="The entry vanishes from the codex. References inside your manuscript are untouched."
      />
    </div>
  );
}

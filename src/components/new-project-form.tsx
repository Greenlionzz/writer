"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BookCopy, Clapperboard, Feather, Layers, Library, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import { Button, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

const TYPES = [
  { id: "novel", label: "Novel", desc: "A single full-length work", icon: NotebookPen, words: 80000 },
  { id: "trilogy", label: "Trilogy", desc: "A three-book arc", icon: Library, words: 240000 },
  { id: "series", label: "Series", desc: "An open-ended saga", icon: Layers, words: 150000 },
  { id: "stories", label: "Story Collection", desc: "Linked short fiction", icon: BookCopy, words: 40000 },
  { id: "screenplay", label: "Screenplay", desc: "Feature or pilot script", icon: Clapperboard, words: 20000 },
] as const;

export function NewProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("novel");
  const [genre, setGenre] = useState("");
  const [premise, setPremise] = useState("");
  const [target, setTarget] = useState<number>(80000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickType(id: string, words: number) {
    setType(id);
    setTarget(words);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Give your project a title — even a working one.");
      return;
    }
    setLoading(true);
    try {
      const { project } = await api<{ project: { id: string } }>("/api/projects", {
        method: "POST",
        body: { title: title.trim(), type, genre, premise, targetWordCount: target },
      });
      toast.success(`“${title.trim()}” is on the shelf.`);
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the project.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <div>
        <span className="mb-2.5 block text-xs font-semibold tracking-wide text-faded uppercase">
          Form
        </span>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pickType(t.id, t.words)}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all duration-150",
                type === t.id
                  ? "border-brass/60 bg-brass/10 shadow-[0_0_0_1px_var(--color-brass)]"
                  : "border-hairline bg-card/60 hover:border-stone-600 hover:bg-lift"
              )}
            >
              <t.icon className={cn("h-5 w-5", type === t.id ? "text-brass" : "text-faded")} />
              <span className={cn("text-sm font-semibold", type === t.id ? "text-cream" : "text-stone-300")}>
                {t.label}
              </span>
              <span className="text-[11px] leading-snug text-stone-500">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Title"
        placeholder="The Lighthouse Between Stars"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        maxLength={160}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Genre"
          placeholder="Hopepunk space opera"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          maxLength={80}
        />
        <Input
          label="Target word count"
          type="number"
          min={1000}
          step={1000}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
        />
      </div>

      <Textarea
        label="Premise — one sentence (optional)"
        placeholder="A disgraced cartographer discovers a lighthouse that shines between star systems — and the map it keeps is alive."
        value={premise}
        onChange={(e) => setPremise(e.target.value)}
        rows={3}
        hint="This seeds your story map. The AI will grow acts, chapters and scenes from this single sentence."
      />

      {error && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-300 animate-fade-in">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-hairline pt-5">
        <Button variant="ghost" type="button" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading} size="lg">
          <Feather className="h-4 w-4" />
          Create project
        </Button>
      </div>
    </form>
  );
}

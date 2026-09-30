"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import {
  ArrowLeft,
  Bold,
  Check,
  CloudUpload,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  LoaderCircle,
  Minus,
  Plus,
  Quote,
  Redo2,
  Sparkles,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client-api";
import { Button, Dialog, Textarea } from "@/components/ui";
import { ProjectHeader, type HeaderProject } from "@/components/project-header";
import { cn, countWords, fmt, timeAgo } from "@/lib/utils";

export type EditorChapter = {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  version: number;
  updatedAt: string;
};

export type ChapterListItem = { id: string; title: string; wordCount: number };

type SaveState = "saved" | "saving" | "unsaved" | "error";

type Conflict = {
  serverVersion: number;
  serverContent: string;
  serverTitle: string;
  serverUpdatedAt: string;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function EditorClient({
  project,
  chapter,
  chapters: initialChapters,
  hasKey,
}: {
  project: HeaderProject;
  chapter: EditorChapter;
  chapters: ChapterListItem[];
  hasKey: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(chapter.title);
  const [baseVersion, setBaseVersion] = useState(chapter.version);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(chapter.updatedAt ? new Date(chapter.updatedAt) : null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [liveWords, setLiveWords] = useState(chapter.wordCount);
  const [chapters, setChapters] = useState(initialChapters);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [addingChapter, setAddingChapter] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const baseVersionRef = useRef(chapter.version);
  const titleRef = useRef(chapter.title);
  const saveFnRef = useRef<(opts?: { force?: boolean; keepalive?: boolean }) => Promise<void>>(async () => {});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({
        placeholder: "The lighthouse keeper found the map folded inside a dead star…",
      }),
      CharacterCount,
    ],
    content: chapter.content,
    autofocus: "end",
    immediatelyRender: false,
    editorProps: { attributes: { class: "tiptap min-h-[58vh] px-1 py-3" } },
    onUpdate: ({ editor }) => {
      const words = editor.storage.characterCount?.words() ?? countWords(editor.getText());
      setLiveWords(words);
      dirtyRef.current = true;
      setSaveState("unsaved");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveFnRef.current({}), 1400);
    },
  });

  const editorRef = useRef(editor);
  editorRef.current = editor;

  const doSave = useCallback(
    async (opts?: { force?: boolean; keepalive?: boolean }) => {
      const ed = editorRef.current;
      if (!ed) return;
      if (ed.isDestroyed) return;
      if (savingRef.current && !opts?.keepalive) {
        dirtyRef.current = true;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => saveFnRef.current({}), 900);
        return;
      }
      const content = ed.getHTML();
      const nextTitle = titleRef.current.trim() || "Untitled chapter";

      if (opts?.keepalive) {
        fetch(`/api/chapters/${chapter.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: nextTitle, content, baseVersion: baseVersionRef.current }),
          keepalive: true,
        }).catch(() => {});
        return;
      }

      savingRef.current = true;
      setSaveState("saving");
      try {
        const res = await api<{ chapter: EditorChapter }>(`/api/chapters/${chapter.id}`, {
          method: "PATCH",
          body: { title: nextTitle, content, baseVersion: baseVersionRef.current, force: opts?.force },
        });
        baseVersionRef.current = res.chapter.version;
        setBaseVersion(res.chapter.version);
        dirtyRef.current = false;
        setSaveState("saved");
        setLastSavedAt(new Date());
        setConflict(null);
        setChapters((cs) =>
          cs.map((c) =>
            c.id === chapter.id ? { ...c, title: res.chapter.title, wordCount: res.chapter.wordCount } : c
          )
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const d = err.data as Record<string, unknown> | undefined;
          setConflict({
            serverVersion: Number(d?.serverVersion ?? 0),
            serverContent: String(d?.serverContent ?? ""),
            serverTitle: String(d?.serverTitle ?? ""),
            serverUpdatedAt: String(d?.serverUpdatedAt ?? ""),
          });
          setSaveState("error");
        } else {
          setSaveState("error");
          toast.error("Autosave failed — your words are still here. Retrying on next change.");
        }
      } finally {
        savingRef.current = false;
      }
    },
    [chapter.id]
  );
  saveFnRef.current = doSave;

  /* Flush pending work on unmount / tab close */
  useEffect(() => {
    const flush = () => {
      if (dirtyRef.current && saveTimer.current) {
        clearTimeout(saveTimer.current);
        void saveFnRef.current({ keepalive: true });
      }
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, []);

  /* Cmd/Ctrl+S */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (saveTimer.current) clearTimeout(saveTimer.current);
        void saveFnRef.current({});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onTitleChange(v: string) {
    setTitle(v);
    titleRef.current = v;
    dirtyRef.current = true;
    setSaveState("unsaved");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveFnRef.current({}), 1400);
  }

  async function navigate(id: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await saveFnRef.current({});
    router.push(`/projects/${project.id}/write/${id}`);
  }

  async function addChapter() {
    setAddingChapter(true);
    try {
      await saveFnRef.current({});
      const res = await api<{ chapter: { id: string } }>(`/api/projects/${project.id}/chapters`, {
        method: "POST",
        body: {},
      });
      router.push(`/projects/${project.id}/write/${res.chapter.id}`);
      router.refresh();
    } catch {
      toast.error("Could not add a chapter.");
      setAddingChapter(false);
    }
  }

  async function continueWithAi() {
    if (!editor || editor.isDestroyed) return;
    setAiLoading(true);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await saveFnRef.current({});
      const res = await api<{
        text: string;
        words: number;
        meta: { provider: string; model: string };
      }>(`/api/chapters/${chapter.id}/continue`, {
        method: "POST",
        body: { instruction: aiInstruction.trim() || undefined },
      });
      const html = res.text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
        .join("");
      editor.chain().focus("end").insertContent(html).run();
      toast.success(`Wrote ~${res.words} words with ${res.meta.provider} ${res.meta.model}`);
      setAiOpen(false);
      setAiInstruction("");
    } catch (err) {
      if (err instanceof ApiError && err.code === "NO_API_KEY") {
        toast.error(err.message, {
          action: { label: "Open Settings", onClick: () => router.push("/settings") },
        });
      } else {
        toast.error(err instanceof ApiError ? err.message : "The AI request failed.");
      }
    } finally {
      setAiLoading(false);
    }
  }

  function resolveConflict(keepMine: boolean) {
    if (keepMine) {
      void doSave({ force: true });
    } else {
      if (conflict && editor && !editor.isDestroyed) {
        editor.commands.setContent(conflict.serverContent);
        setTitle(conflict.serverTitle);
        titleRef.current = conflict.serverTitle;
        baseVersionRef.current = conflict.serverVersion;
        setBaseVersion(conflict.serverVersion);
        setLiveWords(countWords(editor.getText()));
        dirtyRef.current = false;
        setSaveState("saved");
        setLastSavedAt(new Date(conflict.serverUpdatedAt));
      }
      setConflict(null);
    }
    void baseVersion;
  }

  const totalWords = chapters.reduce((a, c) => a + (c.id === chapter.id ? liveWords : c.wordCount), 0);
  const chapterIndex = chapters.findIndex((c) => c.id === chapter.id);

  const saveChip = {
    saved: { icon: Check, text: lastSavedAt ? `Saved ${timeAgo(lastSavedAt)}` : "Saved", tone: "text-stone-400" },
    saving: { icon: CloudUpload, text: "Saving…", tone: "text-brass" },
    unsaved: { icon: CloudUpload, text: "Unsaved changes", tone: "text-amber-300" },
    error: { icon: TriangleAlert, text: "Save failed", tone: "text-red-300" },
  }[saveState];

  const ToolBtn = ({
    onClick,
    active,
    title: tip,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={tip}
      disabled={!editor}
      className={cn(
        "flex h-7.5 w-7.5 items-center justify-center rounded-md transition-colors disabled:opacity-40",
        active ? "bg-brass/15 text-brass-bright" : "text-stone-400 hover:bg-lift hover:text-cream"
      )}
    >
      {children}
    </button>
  );

  void Sparkles;

  return (
    <div>
      <ProjectHeader project={project} />

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Chapter rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-8">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-faded uppercase">Chapters</p>
              <button
                onClick={addChapter}
                disabled={addingChapter}
                className="rounded-md p-1 text-faded transition-colors hover:bg-lift hover:text-brass disabled:opacity-50"
                title="Add chapter"
              >
                {addingChapter ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="max-h-[calc(100dvh-260px)] space-y-0.5 overflow-y-auto pr-1">
              {chapters.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => void navigate(c.id)}
                  className={cn(
                    "group flex w-full items-baseline gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                    c.id === chapter.id ? "bg-lift text-cream" : "text-faded hover:bg-lift/60 hover:text-stone-200"
                  )}
                >
                  <span className={cn("shrink-0 font-display text-[11px]", c.id === chapter.id ? "text-brass" : "text-stone-600")}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-hairline bg-card/60 p-3.5 text-[11px] leading-relaxed text-faded">
              <p className="flex justify-between">
                <span>Chapter</span>
                <span className="font-semibold text-cream">{fmt(liveWords)} words</span>
              </p>
              <p className="mt-1 flex justify-between">
                <span>Project</span>
                <span className="font-semibold text-cream">
                  {fmt(totalWords)} <span className="text-stone-500">/ {fmt(project.targetWordCount)}</span>
                </span>
              </p>
            </div>
          </div>
        </aside>

        {/* Writing column */}
        <div className="min-w-0">
          {/* Toolbar */}
          <div className="sticky top-[57px] z-20 lg:top-4">
            <div className="flex items-center gap-1 rounded-xl border border-hairline bg-panel/95 px-2 py-1.5 shadow-lg shadow-black/30 backdrop-blur">
              <button
                onClick={() => {
                  void (async () => {
                    if (saveTimer.current) clearTimeout(saveTimer.current);
                    await saveFnRef.current({});
                    router.push(`/projects/${project.id}`);
                  })();
                }}
                className="mr-1 flex h-7.5 w-7.5 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-lift hover:text-cream"
                title="Back to project"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="mr-1 hidden text-[11px] whitespace-nowrap text-stone-500 sm:block">
                Ch. {chapterIndex + 1} of {chapters.length}
              </span>
              <div className="h-4 w-px bg-hairline" />
              <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Bold">
                <Bold className="h-3.5 w-3.5" />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Italic">
                <Italic className="h-3.5 w-3.5" />
              </ToolBtn>
              <div className="h-4 w-px bg-hairline" />
              <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} title="Heading">
                <Heading2 className="h-4 w-4" />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} title="Subheading">
                <Heading3 className="h-4 w-4" />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} title="Quote">
                <Quote className="h-3.5 w-3.5" />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} title="Bullet list">
                <List className="h-4 w-4" />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} title="Numbered list">
                <ListOrdered className="h-4 w-4" />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Scene break">
                <Minus className="h-4 w-4" />
              </ToolBtn>
              <div className="h-4 w-px bg-hairline" />
              <ToolBtn onClick={() => editor?.chain().focus().undo().run()} title="Undo">
                <Undo2 className="h-3.5 w-3.5" />
              </ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().redo().run()} title="Redo">
                <Redo2 className="h-3.5 w-3.5" />
              </ToolBtn>

              <div className="ml-auto flex items-center gap-2.5">
                <span className={cn("hidden items-center gap-1.5 text-[11px] font-medium sm:flex", saveChip.tone)}>
                  <saveChip.icon className={cn("h-3.5 w-3.5", saveState === "saving" && "animate-pulse")} />
                  {saveChip.text}
                </span>
                <span className="rounded-md bg-lift px-2 py-1 text-[11px] font-medium text-faded lg:hidden">
                  {fmt(liveWords)}w
                </span>
                <Button
                  size="sm"
                  onClick={() => (hasKey ? setAiOpen(true) : router.push("/settings"))}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Continue with AI
                </Button>
              </div>
            </div>
          </div>

          {/* Manuscript */}
          <div className="mx-auto mt-8 w-full max-w-[760px] animate-fade-up">
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Chapter title"
              className="w-full bg-transparent font-display text-4xl font-semibold tracking-tight text-cream placeholder:text-stone-600 focus:outline-none"
            />
            <div className="mt-2 mb-6 h-px w-24 bg-gradient-to-r from-brass/60 to-transparent" />
            <EditorContent editor={editor} />
            <p className="mt-10 pb-16 text-center text-[11px] tracking-wide text-stone-600">
              {fmt(liveWords)} words · autosaves as you write · ⌘S to save now
            </p>
          </div>
        </div>
      </div>

      {/* AI continue dialog */}
      <Dialog
        open={aiOpen}
        onClose={() => !aiLoading && setAiOpen(false)}
        title="Continue with AI"
        description="Reads this chapter and your codex, then writes the next ~400 words in your voice."
      >
        <Textarea
          label="Steer the passage (optional)"
          rows={3}
          value={aiInstruction}
          onChange={(e) => setAiInstruction(e.target.value)}
          placeholder="e.g. cut to the observatory; let Mara finally open the sealed letter"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setAiOpen(false)} disabled={aiLoading}>
            Cancel
          </Button>
          <Button onClick={continueWithAi} loading={aiLoading}>
            <Sparkles className="h-4 w-4" />
            Write the next passage
          </Button>
        </div>
      </Dialog>

      {/* Conflict dialog */}
      <Dialog
        open={!!conflict}
        onClose={() => {}}
        title="This chapter changed elsewhere"
        description="Autosave paused to protect both versions. Choose which draft survives — the other is discarded."
      >
        <div className="rounded-xl border border-hairline bg-black/30 p-4 text-[13px] leading-relaxed text-faded">
          <p>
            A newer version of <span className="text-cream">“{conflict?.serverTitle}”</span> exists —
            saved {conflict ? timeAgo(conflict.serverUpdatedAt) : ""}, possibly in another tab or on
            another device.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => resolveConflict(false)}>
            Load the latest version
          </Button>
          <Button variant="danger" onClick={() => resolveConflict(true)}>
            Keep my version
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

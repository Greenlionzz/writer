import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { ArrowRight, BookOpen, Network } from "lucide-react";
import { db } from "@/db";
import { chapters, codexEntries, projects, storyNodes } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { ProjectHeader } from "@/components/project-header";
import { ChaptersPanel, type PanelChapter } from "@/components/chapters-panel";
import { codexKindLabel } from "@/lib/constants";
import { fmt } from "@/lib/utils";

function ProgressRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#221e19" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a97f3f" />
            <stop offset="100%" stopColor="#e5b96f" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl leading-none font-semibold text-cream">
          {Math.round(clamped)}%
        </span>
        <span className="mt-1 text-[10px] tracking-wider text-faded uppercase">of target</span>
      </div>
    </div>
  );
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .limit(1);
  if (!project) notFound();

  const [chapterRows, nodeCounts, recentCodex, codexTotal] = await Promise.all([
    db
      .select()
      .from(chapters)
      .where(eq(chapters.projectId, id))
      .orderBy(asc(chapters.position), asc(chapters.createdAt)),
    db
      .select({ kind: storyNodes.kind, count: sql<number>`count(*)::int` })
      .from(storyNodes)
      .where(eq(storyNodes.projectId, id))
      .groupBy(storyNodes.kind),
    db
      .select()
      .from(codexEntries)
      .where(eq(codexEntries.projectId, id))
      .orderBy(desc(codexEntries.updatedAt))
      .limit(4),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(codexEntries)
      .where(eq(codexEntries.projectId, id)),
  ]);

  const words = chapterRows.reduce((a, c) => a + c.wordCount, 0);
  const nodeMap = Object.fromEntries(nodeCounts.map((n) => [n.kind, n.count]));
  const totalNodes = nodeCounts.reduce((a, n) => a + n.count, 0);

  const panelChapters: PanelChapter[] = chapterRows.map((c) => ({
    id: c.id,
    title: c.title,
    wordCount: c.wordCount,
    updatedAt: c.updatedAt.toISOString(),
    version: c.version,
  }));

  const headerProject = {
    id: project.id,
    title: project.title,
    type: project.type,
    genre: project.genre,
    status: project.status,
    premise: project.premise,
    targetWordCount: project.targetWordCount,
  };

  return (
    <div>
      <ProjectHeader project={headerProject} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* Progress card */}
          <div className="grain flex flex-wrap items-center gap-6 rounded-2xl border border-hairline bg-card/70 p-6 animate-fade-up">
            <ProgressRing pct={(words / Math.max(1, project.targetWordCount)) * 100} />
            <div className="min-w-48 flex-1">
              <p className="text-xs font-semibold tracking-[0.18em] text-faded uppercase">
                Manuscript progress
              </p>
              <p className="font-display mt-2 text-3xl font-semibold text-cream">
                {fmt(words)}{" "}
                <span className="text-lg font-normal text-faded">of {fmt(project.targetWordCount)} words</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-faded">
                <span>
                  <span className="text-cream">{chapterRows.length}</span> chapter
                  {chapterRows.length === 1 ? "" : "s"}
                </span>
                <span>
                  <span className="text-cream">{nodeMap["scene"] ?? 0}</span> scenes mapped
                </span>
                <span>
                  <span className="text-cream">{codexTotal[0]?.count ?? 0}</span> codex entries
                </span>
              </div>
            </div>
          </div>

          <ChaptersPanel projectId={id} chapters={panelChapters} />
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <div className="grain rounded-2xl border border-hairline bg-card/70 p-5 animate-fade-up [animation-delay:80ms]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-[0.18em] text-faded uppercase">Story spine</p>
              <Link href={`/projects/${id}/map`} className="text-faded transition-colors hover:text-brass">
                <Network className="h-4 w-4" />
              </Link>
            </div>
            {totalNodes === 0 ? (
              <div className="mt-3">
                <p className="text-[13px] leading-relaxed text-faded">
                  No map yet. Seed your premise and let AI grow acts, chapters and scenes.
                </p>
                <Link
                  href={`/projects/${id}/map`}
                  className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brass hover:text-brass-bright"
                >
                  Open the story map <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {[
                  { kind: "act", label: "Acts", color: "#a78bfa" },
                  { kind: "chapter", label: "Chapters", color: "#38bdf8" },
                  { kind: "scene", label: "Scenes", color: "#34d399" },
                ].map((row) => (
                  <div key={row.kind} className="flex items-center gap-2.5 text-[13px]">
                    <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                    <span className="flex-1 text-faded">{row.label}</span>
                    <span className="font-medium text-cream">{nodeMap[row.kind] ?? 0}</span>
                  </div>
                ))}
                <Link
                  href={`/projects/${id}/map`}
                  className="mt-2 inline-flex items-center gap-1.5 pt-1 text-[13px] font-semibold text-brass hover:text-brass-bright"
                >
                  Grow the map <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>

          <div className="grain rounded-2xl border border-hairline bg-card/70 p-5 animate-fade-up [animation-delay:140ms]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-[0.18em] text-faded uppercase">Codex</p>
              <Link href={`/projects/${id}/codex`} className="text-faded transition-colors hover:text-brass">
                <BookOpen className="h-4 w-4" />
              </Link>
            </div>
            {recentCodex.length === 0 ? (
              <p className="mt-3 text-[13px] leading-relaxed text-faded">
                Characters, locations, lore and plot points will appear here as you build your world.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {recentCodex.map((e) => (
                  <li key={e.id} className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-stone-200">{e.name}</p>
                    <p className="truncate text-[11px] text-stone-500">{codexKindLabel(e.kind)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

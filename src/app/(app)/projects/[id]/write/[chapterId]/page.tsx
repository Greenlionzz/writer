import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, chapters, projects } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { EditorClient, type EditorChapter, type ChapterListItem } from "@/components/editor-client";

export default async function WritePage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const { id, chapterId } = await params;
  const user = await getSessionUser();

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .limit(1);
  if (!project) notFound();

  const [chapterRows, keyRows] = await Promise.all([
    db
      .select()
      .from(chapters)
      .where(eq(chapters.projectId, id))
      .orderBy(asc(chapters.position), asc(chapters.createdAt)),
    db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id))
      .limit(1),
  ]);

  const chapter = chapterRows.find((c) => c.id === chapterId);
  if (!chapter) notFound();

  const current: EditorChapter = {
    id: chapter.id,
    title: chapter.title,
    content: chapter.content,
    wordCount: chapter.wordCount,
    version: chapter.version,
    updatedAt: chapter.updatedAt.toISOString(),
  };

  const list: ChapterListItem[] = chapterRows.map((c) => ({
    id: c.id,
    title: c.title,
    wordCount: c.wordCount,
  }));

  return (
    <EditorClient
      key={chapter.id}
      project={{
        id: project.id,
        title: project.title,
        type: project.type,
        genre: project.genre,
        status: project.status,
        premise: project.premise,
        targetWordCount: project.targetWordCount,
      }}
      chapter={current}
      chapters={list}
      hasKey={keyRows.length > 0}
    />
  );
}

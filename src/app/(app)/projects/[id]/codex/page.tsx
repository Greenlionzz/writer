import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { codexEntries, projects } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { CodexClient, type SerializedEntry } from "@/components/codex-client";

export default async function CodexPage({
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

  const rows = await db
    .select()
    .from(codexEntries)
    .where(eq(codexEntries.projectId, id))
    .orderBy(asc(codexEntries.kind), asc(codexEntries.name));

  const entries: SerializedEntry[] = rows.map((e) => ({
    id: e.id,
    kind: e.kind,
    name: e.name,
    summary: e.summary,
    content: e.content,
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <CodexClient
      project={{
        id: project.id,
        title: project.title,
        type: project.type,
        genre: project.genre,
        status: project.status,
        premise: project.premise,
        targetWordCount: project.targetWordCount,
      }}
      initialEntries={entries}
    />
  );
}

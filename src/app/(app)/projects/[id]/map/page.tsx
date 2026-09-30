import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, projects, storyNodes } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { StoryMapClient, type SerializedNode } from "@/components/story-map-client";

export default async function StoryMapPage({
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

  const [nodeRows, keyRows] = await Promise.all([
    db
      .select()
      .from(storyNodes)
      .where(eq(storyNodes.projectId, id))
      .orderBy(asc(storyNodes.createdAt)),
    db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id))
      .limit(1),
  ]);

  const nodes: SerializedNode[] = nodeRows.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    summary: n.summary,
    parentId: n.parentId,
    chapterId: n.chapterId,
  }));

  return (
    <StoryMapClient
      project={{
        id: project.id,
        title: project.title,
        type: project.type,
        genre: project.genre,
        status: project.status,
        premise: project.premise,
        targetWordCount: project.targetWordCount,
      }}
      initialNodes={nodes}
      hasKey={keyRows.length > 0}
    />
  );
}

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, chapters, codexEntries, projects } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { DashboardClient, type DashboardProject } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const user = await getSessionUser();

  const [rows, keyRows] = await Promise.all([
    db
      .select({
        project: projects,
        words: sql<number>`coalesce(sum(${chapters.wordCount}),0)::int`,
        chapterCount: sql<number>`count(${chapters.id})::int`,
        codexCount: sql<number>`(select count(*) from ${codexEntries} where project_id = ${projects.id})::int`,
      })
      .from(projects)
      .leftJoin(chapters, eq(chapters.projectId, projects.id))
      .where(eq(projects.userId, user.id))
      .groupBy(projects.id)
      .orderBy(desc(projects.updatedAt)),
    db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id))
      .limit(1),
  ]);

  const serialized: DashboardProject[] = rows.map((r) => ({
    id: r.project.id,
    title: r.project.title,
    type: r.project.type,
    genre: r.project.genre,
    status: r.project.status,
    premise: r.project.premise,
    targetWordCount: r.project.targetWordCount,
    updatedAt: r.project.updatedAt.toISOString(),
    words: r.words,
    chapterCount: r.chapterCount,
    codexCount: r.codexCount,
  }));

  return (
    <DashboardClient
      name={user.name}
      projects={serialized}
      hasKey={keyRows.length > 0}
    />
  );
}

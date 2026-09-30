import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { chapters, codexEntries, projects, storyNodes } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { json, notFound, unauthorized, getOwnedProject } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) return notFound("Project not found.");

  const chapterRows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.projectId, id))
    .orderBy(asc(chapters.position), asc(chapters.createdAt));

  const [stats] = await db
    .select({
      words: sql<number>`coalesce((select sum(word_count) from ${chapters} where project_id = ${id}),0)::int`,
      codexCount: sql<number>`(select count(*) from ${codexEntries} where project_id = ${id})::int`,
      nodeCount: sql<number>`(select count(*) from ${storyNodes} where project_id = ${id})::int`,
    })
    .from(projects)
    .where(eq(projects.id, id));

  return json({
    project: { ...project, words: stats?.words ?? 0, codexCount: stats?.codexCount ?? 0, nodeCount: stats?.nodeCount ?? 0 },
    chapters: chapterRows,
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) return notFound("Project not found.");

  const body = await req.json().catch(() => null);
  const updates: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
  if (typeof body?.title === "string" && body.title.trim()) updates.title = body.title.trim();
  if (typeof body?.type === "string") updates.type = body.type;
  if (typeof body?.genre === "string") updates.genre = body.genre.trim();
  if (typeof body?.status === "string") updates.status = body.status;
  if (typeof body?.premise === "string") updates.premise = body.premise.trim();
  if (Number.isFinite(Number(body?.targetWordCount)) && Number(body.targetWordCount) > 0)
    updates.targetWordCount = Math.round(Number(body.targetWordCount));

  const [updated] = await db
    .update(projects)
    .set(updates)
    .where(eq(projects.id, id))
    .returning();
  return json({ project: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) return notFound("Project not found.");
  await db.delete(projects).where(eq(projects.id, id));
  return json({ ok: true });
}

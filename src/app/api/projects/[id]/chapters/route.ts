import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { chapters, projects } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { json, notFound, unauthorized, getOwnedProject, badRequest } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) return notFound("Project not found.");

  const body = await req.json().catch(() => null);
  const [max] = await db
    .select({ pos: sql<number>`coalesce(max(position), -1)::int` })
    .from(chapters)
    .where(eq(chapters.projectId, id));

  const [chapter] = await db
    .insert(chapters)
    .values({
      projectId: id,
      title: String(body?.title ?? "").trim() || `Chapter ${(max?.pos ?? -1) + 2}`,
      position: (max?.pos ?? -1) + 1,
      content: String(body?.content ?? ""),
    })
    .returning();

  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, id));
  return json({ chapter }, 201);
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) return notFound("Project not found.");
  const rows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.projectId, id))
    .orderBy(asc(chapters.position), asc(chapters.createdAt));
  return json({ chapters: rows });
}

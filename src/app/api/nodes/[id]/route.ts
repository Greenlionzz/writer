import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, storyNodes } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { json, notFound, unauthorized } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnedNode(nodeId: string, userId: string) {
  const rows = await db
    .select({ node: storyNodes })
    .from(storyNodes)
    .innerJoin(
      projects,
      and(eq(projects.id, storyNodes.projectId), eq(projects.userId, userId))
    )
    .where(eq(storyNodes.id, nodeId))
    .limit(1);
  return rows[0]?.node ?? null;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const node = await getOwnedNode(id, user.id);
  if (!node) return notFound("Node not found.");

  const body = await req.json().catch(() => null);
  const updates: Partial<typeof storyNodes.$inferInsert> = { updatedAt: new Date() };
  if (typeof body?.title === "string" && body.title.trim()) updates.title = body.title.trim();
  if (typeof body?.summary === "string") updates.summary = body.summary;

  const [updated] = await db
    .update(storyNodes)
    .set(updates)
    .where(eq(storyNodes.id, id))
    .returning();
  return json({ node: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const node = await getOwnedNode(id, user.id);
  if (!node) return notFound("Node not found.");
  await db.delete(storyNodes).where(eq(storyNodes.id, id));
  return json({ ok: true });
}

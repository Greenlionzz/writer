import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { codexEntries, projects } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { json, notFound, unauthorized } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnedEntry(entryId: string, userId: string) {
  const rows = await db
    .select({ entry: codexEntries })
    .from(codexEntries)
    .innerJoin(
      projects,
      and(eq(projects.id, codexEntries.projectId), eq(projects.userId, userId))
    )
    .where(eq(codexEntries.id, entryId))
    .limit(1);
  return rows[0]?.entry ?? null;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const entry = await getOwnedEntry(id, user.id);
  if (!entry) return notFound("Entry not found.");

  const body = await req.json().catch(() => null);
  const updates: Partial<typeof codexEntries.$inferInsert> = { updatedAt: new Date() };
  if (typeof body?.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body?.summary === "string") updates.summary = body.summary.trim();
  if (typeof body?.content === "string") updates.content = body.content;
  if (["character", "location", "lore", "plot"].includes(body?.kind)) updates.kind = body.kind;

  const [updated] = await db
    .update(codexEntries)
    .set(updates)
    .where(eq(codexEntries.id, id))
    .returning();
  return json({ entry: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const entry = await getOwnedEntry(id, user.id);
  if (!entry) return notFound("Entry not found.");
  await db.delete(codexEntries).where(eq(codexEntries.id, id));
  return json({ ok: true });
}

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { chapters } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { json, badRequest, notFound, unauthorized, getOwnedProject } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) return notFound("Project not found.");

  const body = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
  if (ids.length === 0) return badRequest("ids must be a non-empty array.");

  const owned = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(eq(chapters.projectId, id));
  const ownedIds = new Set(owned.map((c) => c.id));
  if (!ids.every((cid) => ownedIds.has(cid)))
    return badRequest("Invalid chapter order.");

  await Promise.all(
    ids.map((cid, i) =>
      db.update(chapters).set({ position: i }).where(eq(chapters.id, cid))
    )
  );
  const rows = await db
    .select()
    .from(chapters)
    .where(inArray(chapters.id, ids));
  return json({ ok: true, chapters: rows });
}

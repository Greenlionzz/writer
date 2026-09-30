import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { codexEntries } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { json, badRequest, notFound, unauthorized, getOwnedProject } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) return notFound("Project not found.");
  const rows = await db
    .select()
    .from(codexEntries)
    .where(eq(codexEntries.projectId, id))
    .orderBy(asc(codexEntries.kind), asc(codexEntries.name));
  return json({ entries: rows });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) return notFound("Project not found.");

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) return badRequest("A name is required.");
  const kind = ["character", "location", "lore", "plot"].includes(body?.kind)
    ? body.kind
    : "character";

  const [entry] = await db
    .insert(codexEntries)
    .values({
      projectId: id,
      kind,
      name,
      summary: String(body?.summary ?? "").trim(),
      content: String(body?.content ?? ""),
    })
    .returning();
  return json({ entry }, 201);
}

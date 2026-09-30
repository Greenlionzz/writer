import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { storyNodes } from "@/db/schema";
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
    .from(storyNodes)
    .where(eq(storyNodes.projectId, id))
    .orderBy(asc(storyNodes.createdAt));
  return json({ nodes: rows });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) return notFound("Project not found.");

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  if (!title) return badRequest("A title is required.");
  const kind = ["premise", "act", "chapter", "scene"].includes(body?.kind)
    ? body.kind
    : "premise";
  if (kind === "premise") {
    const [root] = await db
      .select({ id: storyNodes.id })
      .from(storyNodes)
      .where(eq(storyNodes.projectId, id))
      .limit(1);
    if (root && !body?.parentId) return badRequest("This project already has a premise node.");
  }

  const [node] = await db
    .insert(storyNodes)
    .values({
      projectId: id,
      kind,
      title,
      summary: String(body?.summary ?? "").trim(),
      parentId: body?.parentId ? String(body.parentId) : null,
    })
    .returning();
  return json({ node }, 201);
}

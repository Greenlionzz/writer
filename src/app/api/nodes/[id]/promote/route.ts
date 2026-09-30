import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { chapters, projects, storyNodes } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { json, badRequest, notFound, unauthorized } from "@/lib/api-helpers";
import { countWordsFromHtml } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const rows = await db
    .select({ node: storyNodes })
    .from(storyNodes)
    .innerJoin(
      projects,
      and(eq(projects.id, storyNodes.projectId), eq(projects.userId, user.id))
    )
    .where(eq(storyNodes.id, id))
    .limit(1);
  const node = rows[0]?.node;
  if (!node) return notFound("Node not found.");
  if (node.kind !== "chapter")
    return badRequest("Only chapter nodes can be promoted into the manuscript.");

  // Already promoted — return the existing chapter.
  if (node.chapterId) {
    const [existing] = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, node.chapterId))
      .limit(1);
    if (existing) return json({ chapter: existing, already: true });
  }

  const scenes = await db
    .select()
    .from(storyNodes)
    .where(eq(storyNodes.parentId, node.id))
    .orderBy(asc(storyNodes.createdAt));

  const outline = [
    node.summary ? `<p><em>${escapeHtml(node.summary)}</em></p>` : "",
    scenes.length > 0
      ? `<h3>Scene beats</h3><ul>${scenes
          .map(
            (s) =>
              `<li><strong>${escapeHtml(s.title)}</strong>${
                s.summary ? ` — ${escapeHtml(s.summary)}` : ""
              }</li>`
          )
          .join("")}</ul><p></p>`
      : "",
  ].join("");

  const [max] = await db
    .select({ pos: sql<number>`coalesce(max(position), -1)::int` })
    .from(chapters)
    .where(eq(chapters.projectId, node.projectId));

  const [chapter] = await db
    .insert(chapters)
    .values({
      projectId: node.projectId,
      title: node.title,
      content: outline,
      position: (max?.pos ?? -1) + 1,
      wordCount: countWordsFromHtml(outline),
    })
    .returning();

  const [updatedNode] = await db
    .update(storyNodes)
    .set({ chapterId: chapter.id, updatedAt: new Date() })
    .where(eq(storyNodes.id, node.id))
    .returning();

  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, node.projectId));

  return json({ chapter, node: updatedNode }, 201);
}

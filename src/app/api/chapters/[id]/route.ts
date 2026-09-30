import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, projects } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { json, notFound, unauthorized } from "@/lib/api-helpers";
import { countWordsFromHtml } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnedChapter(chapterId: string, userId: string) {
  const rows = await db
    .select({ chapter: chapters, project: projects })
    .from(chapters)
    .innerJoin(
      projects,
      and(eq(projects.id, chapters.projectId), eq(projects.userId, userId))
    )
    .where(eq(chapters.id, chapterId))
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const owned = await getOwnedChapter(id, user.id);
  if (!owned) return notFound("Chapter not found.");
  return json({ chapter: owned.chapter, project: owned.project });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const owned = await getOwnedChapter(id, user.id);
  if (!owned) return notFound("Chapter not found.");
  const { chapter, project } = owned;

  const body = await req.json().catch(() => null);
  const baseVersion = Number(body?.baseVersion);
  const force = body?.force === true;

  // Concurrent-edit detection: refuse saves based on a stale version.
  if (!force && Number.isFinite(baseVersion) && chapter.version !== baseVersion) {
    return json(
      {
        error: "conflict",
        message:
          "This chapter was modified elsewhere since you opened it. Your changes were not saved.",
        serverVersion: chapter.version,
        serverUpdatedAt: chapter.updatedAt,
        serverTitle: chapter.title,
        serverContent: chapter.content,
      },
      409
    );
  }

  const updates: Partial<typeof chapters.$inferInsert> = {
    version: chapter.version + 1,
    updatedAt: new Date(),
  };
  if (typeof body?.title === "string" && body.title.trim())
    updates.title = body.title.trim();
  if (typeof body?.content === "string") {
    updates.content = body.content;
    updates.wordCount = countWordsFromHtml(body.content);
  }

  const [updated] = await db
    .update(chapters)
    .set(updates)
    .where(eq(chapters.id, id))
    .returning();
  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, project.id));

  return json({ chapter: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const owned = await getOwnedChapter(id, user.id);
  if (!owned) return notFound("Chapter not found.");
  await db.delete(chapters).where(eq(chapters.id, id));
  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, owned.project.id));
  return json({ ok: true });
}

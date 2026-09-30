import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { chapters, projects } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { json, badRequest, unauthorized } from "@/lib/api-helpers";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const rows = await db
    .select({
      project: projects,
      words: sql<number>`coalesce(sum(${chapters.wordCount}),0)::int`,
      chapterCount: sql<number>`count(${chapters.id})::int`,
    })
    .from(projects)
    .leftJoin(chapters, eq(chapters.projectId, projects.id))
    .where(eq(projects.userId, user.id))
    .groupBy(projects.id)
    .orderBy(desc(projects.updatedAt));
  return json({
    projects: rows.map((r) => ({
      ...r.project,
      words: r.words,
      chapterCount: r.chapterCount,
    })),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  if (!title) return badRequest("A title is required.");
  const [project] = await db
    .insert(projects)
    .values({
      userId: user.id,
      title,
      type: String(body?.type ?? "novel"),
      genre: String(body?.genre ?? "").trim(),
      premise: String(body?.premise ?? "").trim(),
      targetWordCount:
        Number.isFinite(Number(body?.targetWordCount)) && Number(body?.targetWordCount) > 0
          ? Math.round(Number(body.targetWordCount))
          : 60000,
      status: "draft",
    })
    .returning();
  return json({ project }, 201);
}

import { asc, eq } from "drizzle-orm";
import TurndownService from "turndown";
import { db } from "@/db";
import { chapters, projects } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { projectTypeLabel } from "@/lib/constants";
import { slugify } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await ctx.params;
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!project || project.userId !== user.id) {
    return new Response("Not found", { status: 404 });
  }

  const rows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.projectId, id))
    .orderBy(asc(chapters.position), asc(chapters.createdAt));

  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    emDelimiter: "*",
  });

  const header = [
    `# ${project.title}`,
    "",
    `*A ${project.genre ? `${project.genre} ` : ""}${projectTypeLabel(project.type).toLowerCase()}*`,
    "",
    project.premise ? `> ${project.premise}` : "",
    "",
    `---`,
    "",
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const body = rows
    .map((ch, i) => {
      const md = td.turndown(ch.content || "").trim();
      return [`## ${ch.title || `Chapter ${i + 1}`}`, "", md, ""].join("\n");
    })
    .join("\n\n");

  const totalWords = rows.reduce((a, c) => a + (c.wordCount ?? 0), 0);
  const markdown = `${header}\n${body}\n\n---\n*${rows.length} chapter${
    rows.length === 1 ? "" : "s"
  } · ${new Intl.NumberFormat("en-US").format(totalWords)} words · exported from Fabula*\n`;

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(project.title)}.md"`,
    },
  });
}

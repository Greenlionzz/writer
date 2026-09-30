import { and, asc, eq } from "drizzle-orm";
import { generateText } from "ai";
import { db } from "@/db";
import { chapters, codexEntries, projects } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getUserLlm, providerName } from "@/lib/llm";
import { countWords, stripHtml } from "@/lib/utils";
import { json, notFound, unauthorized } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const rows = await db
    .select({ chapter: chapters, project: projects })
    .from(chapters)
    .innerJoin(
      projects,
      and(eq(projects.id, chapters.projectId), eq(projects.userId, user.id))
    )
    .where(eq(chapters.id, id))
    .limit(1);
  const owned = rows[0];
  if (!owned) return notFound("Chapter not found.");
  const { chapter, project } = owned;

  const body = await req.json().catch(() => null);
  const instruction = String(body?.instruction ?? "").trim().slice(0, 500);

  const llm = await getUserLlm(user.id, body?.keyId ? String(body.keyId) : undefined);
  if (!llm) {
    return json(
      {
        error: "NO_API_KEY",
        message:
          "Connect an AI provider first — add your OpenAI, Anthropic, or Gemini API key in Settings.",
      },
      400
    );
  }

  const entries = await db
    .select()
    .from(codexEntries)
    .where(eq(codexEntries.projectId, project.id))
    .orderBy(asc(codexEntries.kind), asc(codexEntries.name))
    .limit(14);
  const codexText = entries
    .map((e) => `- [${e.kind}] ${e.name}${e.summary ? ` — ${e.summary.slice(0, 140)}` : ""}`)
    .join("\n");

  const manuscript = stripHtml(chapter.content).replace(/\s+/g, " ").trim();
  const tail = manuscript.slice(-6500);

  const prompt = `You are ghostwriting the next passage of a ${project.genre || "literary"} ${project.type} titled "${project.title}".
${project.premise ? `Premise: ${project.premise}\n` : ""}
${codexText ? `WORLD CODEX:\n${codexText}\n` : ""}
CURRENT CHAPTER: "${chapter.title}"
TEXT SO FAR (may be truncated to the most recent passage):
"""
${tail || "(the chapter is empty — begin it with a striking opening scene)"}
"""

Continue the manuscript directly from where it stops, in the established voice, POV and tense.
- Write ~350-450 words of fresh prose. Paragraphs only — no headings, titles, or commentary.
- Do not repeat or paraphrase the existing text. Advance the scene with concrete detail, dialogue where natural, and sensory specificity.
${instruction ? `- AUTHOR'S INSTRUCTION (follow exactly): ${instruction}` : ""}`;

  try {
    const { text } = await generateText({
      model: llm.model,
      system:
        "You are an award-winning novelist continuing a manuscript seamlessly. Output only prose in the established voice — never meta commentary.",
      prompt,
    });
    return json({
      text: text.trim(),
      words: countWords(text),
      meta: { provider: providerName(llm.provider), model: llm.modelName },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : "Generation failed.";
    return json(
      {
        error: "PROVIDER_ERROR",
        message: `The ${llm.providerLabel} request failed: ${message}. Check your API key in Settings.`,
      },
      502
    );
  }
}

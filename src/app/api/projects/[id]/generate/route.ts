import { asc, eq } from "drizzle-orm";
import { generateObject } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { codexEntries, storyNodes } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getUserLlm, providerName } from "@/lib/llm";
import { childKind } from "@/lib/utils";
import { json, badRequest, notFound, unauthorized, getOwnedProject } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

const COUNT_LIMITS: Record<string, { min: number; max: number; def: number }> = {
  premise: { min: 2, max: 5, def: 3 },
  act: { min: 2, max: 8, def: 3 },
  chapter: { min: 2, max: 8, def: 4 },
};

const CHILD_NOUN: Record<string, string> = {
  premise: "act",
  act: "chapter",
  chapter: "scene",
};

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const project = await getOwnedProject(id, user.id);
  if (!project) return notFound("Project not found.");

  const body = await req.json().catch(() => null);
  const nodeId = String(body?.nodeId ?? "");
  const directive = String(body?.directive ?? "").trim();
  if (!nodeId) return badRequest("nodeId is required.");

  const [node] = await db
    .select()
    .from(storyNodes)
    .where(eq(storyNodes.id, nodeId))
    .limit(1);
  if (!node || node.projectId !== id) return notFound("Node not found.");

  const targetKind = childKind(node.kind);
  if (!targetKind) return badRequest("Scenes are the finest level of the story map.");

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

  // Gather context: all nodes for lineage + siblings, plus codex.
  const allNodes = await db
    .select()
    .from(storyNodes)
    .where(eq(storyNodes.projectId, id))
    .orderBy(asc(storyNodes.createdAt));
  const byId = new Map(allNodes.map((n) => [n.id, n]));

  const lineage: string[] = [];
  let cur: (typeof allNodes)[number] | undefined = node;
  while (cur) {
    lineage.unshift(
      `${cur.kind.toUpperCase()} — ${cur.title}${cur.summary ? `: ${cur.summary}` : ""}`
    );
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }

  const siblings = allNodes
    .filter((n) => n.parentId === node.id)
    .map((n) => `- ${n.title}: ${n.summary}`.slice(0, 200));

  const entries = await db
    .select()
    .from(codexEntries)
    .where(eq(codexEntries.projectId, id))
    .orderBy(asc(codexEntries.kind), asc(codexEntries.name))
    .limit(16);
  const codexText = entries
    .map((e) => `- [${e.kind}] ${e.name}${e.summary ? ` — ${e.summary.slice(0, 160)}` : ""}`)
    .join("\n");

  const limits = COUNT_LIMITS[node.kind] ?? { min: 2, max: 8, def: 4 };
  const requested = Number(body?.count);
  const count = Number.isFinite(requested)
    ? Math.min(limits.max, Math.max(limits.min, Math.round(requested)))
    : limits.def;

  const childNoun = CHILD_NOUN[node.kind] ?? "beat";
  const prompt = `You are a master story architect expanding an author's story map one level deeper.

PROJECT
- Title: ${project.title}
- Form: ${project.type}${project.genre ? ` | Genre: ${project.genre}` : ""}
${project.premise ? `- Premise: ${project.premise}` : ""}

STORY LINEAGE (top = premise, bottom = current node)
${lineage.join("\n")}

${siblings.length > 0 ? `EXISTING ${childNoun.toUpperCase()}S UNDER THIS ${node.kind.toUpperCase()} (do not duplicate or restate them):\n${siblings.join("\n")}\n` : ""}
${codexText ? `WORLD CODEX (use these people, places, lore and plot points where natural):\n${codexText}\n` : ""}
TASK
Generate exactly ${count} ${childNoun}${count > 1 ? "s" : ""} that decompose the current ${node.kind} ("${node.title}").
${node.kind === "premise" ? "- Use a dramatic structure that suits the genre (e.g., three-act, five-act, hero's journey arc).\n- Each act must raise stakes and end on a turn." : ""}${node.kind === "act" ? "- Chapters must escalate within the act and each end on a hook.\n- Give each chapter a compelling, evocative title." : ""}${node.kind === "chapter" ? "- Scenes need a clear POV moment, conflict, and outcome.\n- Order scenes so tension builds across the chapter." : ""}
- Every title is short (2-7 words, except scene titles which may be a beat phrase).
- Every summary is 1-2 concrete sentences naming characters, places, or events from the codex where relevant.
${directive ? `\nAUTHOR'S DIRECTIVE (honor this above all): ${directive}` : ""}`;

  try {
    const { object } = await generateObject({
      model: llm.model,
      schema: z.object({
        children: z
          .array(
            z.object({
              title: z.string().describe(`Short ${childNoun} title`),
              summary: z.string().describe("1-2 concrete sentences"),
            })
          )
          .min(1)
          .max(10),
      }),
      system:
        "You are a bestselling story editor. Be vivid, specific and structural — never generic. Honor the author's premise, codex and directive exactly.",
      prompt,
    });

    const created = [];
    for (const child of object.children) {
      const [row] = await db
        .insert(storyNodes)
        .values({
          projectId: id,
          kind: targetKind,
          parentId: node.id,
          title: child.title.trim().slice(0, 200),
          summary: child.summary.trim(),
        })
        .returning();
      created.push(row);
    }
    return json({
      nodes: created,
      meta: { provider: providerName(llm.provider), model: llm.modelName },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 300) : "Generation failed.";
    return json(
      {
        error: "PROVIDER_ERROR",
        message: `The ${llm.providerLabel} request failed: ${message}. Check your API key and model name in Settings.`,
      },
      502
    );
  }
}

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { json, notFound, unauthorized } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)))
    .limit(1);
  if (!row) return notFound("Key not found.");
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
  return json({ ok: true });
}

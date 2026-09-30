import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { isProvider, PROVIDERS, providerName } from "@/lib/llm";
import { json, badRequest, unauthorized } from "@/lib/api-helpers";

const META = {
  id: apiKeys.id,
  provider: apiKeys.provider,
  label: apiKeys.label,
  model: apiKeys.model,
  last4: apiKeys.last4,
  createdAt: apiKeys.createdAt,
} as const;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const rows = await db
    .select(META)
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.id))
    .orderBy(desc(apiKeys.createdAt));
  return json({ keys: rows });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const body = await req.json().catch(() => null);
  const provider = String(body?.provider ?? "");
  if (!isProvider(provider)) return badRequest("Unknown provider.");
  const rawKey = String(body?.key ?? "").trim();
  if (rawKey.length < 8) return badRequest("That API key looks too short.");

  const defaults = PROVIDERS.find((p) => p.id === provider)!;
  const model = String(body?.model ?? "").trim() || defaults.defaultModel;
  const label = String(body?.label ?? "").trim() || `${providerName(provider)} key`;
  const { ciphertext, iv, authTag } = encryptSecret(rawKey);

  const [row] = await db
    .insert(apiKeys)
    .values({
      userId: user.id,
      provider,
      label,
      model,
      ciphertext,
      iv,
      authTag,
      last4: rawKey.slice(-4),
    })
    .returning(META);
  return json({ key: row }, 201);
}

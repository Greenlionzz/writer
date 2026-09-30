import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { decryptSecret } from "./crypto";
import { providerName } from "./providers";

export { PROVIDERS, isProvider, providerName } from "./providers";
export type { ProviderId } from "./providers";

/**
 * Resolves a user's stored (AES-GCM encrypted) API key into a ready-to-use
 * AI SDK model. Defaults to the most recently added key.
 */
export async function getUserLlm(userId: string, keyId?: string) {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
  if (rows.length === 0) return null;
  const row = keyId ? rows.find((r) => r.id === keyId) : rows[0];
  if (!row) return null;
  const key = decryptSecret(row.ciphertext, row.iv, row.authTag);
  let model;
  if (row.provider === "openai") {
    model = createOpenAI({ apiKey: key })(row.model);
  } else if (row.provider === "anthropic") {
    model = createAnthropic({ apiKey: key })(row.model);
  } else {
    model = createGoogleGenerativeAI({ apiKey: key })(row.model);
  }
  return {
    model,
    provider: row.provider,
    providerLabel: providerName(row.provider),
    modelName: row.model,
    keyId: row.id,
  };
}

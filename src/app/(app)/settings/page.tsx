import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { SettingsClient, type KeyMeta } from "@/components/settings-client";

export const metadata = { title: "API Keys & Settings — Fabula" };

export default async function SettingsPage() {
  const user = await getSessionUser();

  const rows = await db
    .select({
      id: apiKeys.id,
      provider: apiKeys.provider,
      label: apiKeys.label,
      model: apiKeys.model,
      last4: apiKeys.last4,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.id))
    .orderBy(desc(apiKeys.createdAt));

  const keys: KeyMeta[] = rows.map((k) => ({ ...k, createdAt: k.createdAt.toISOString() }));

  return <SettingsClient initialKeys={keys} />;
}

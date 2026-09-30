import { cache } from "react";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { hashPassword } from "./crypto";

const DEFAULT_EMAIL = "writer@fabula.local";
const DEFAULT_NAME = "Writer";

/**
 * Fabula runs account-free: every visitor shares one implicit local
 * workspace. The first request materializes the workspace owner row and
 * every read afterwards reuses it. No sessions, no sign-ups.
 */
export const getSessionUser = cache(async (): Promise<User> => {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEFAULT_EMAIL))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({
      email: DEFAULT_EMAIL,
      name: DEFAULT_NAME,
      passwordHash: hashPassword(randomBytes(24).toString("hex")),
    })
    .returning();
  return created;
});

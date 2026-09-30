import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

/** All workspace data is live — never prerender the app subtree. */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  const rows = await db
    .select({ id: projects.id, title: projects.title, type: projects.type })
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.updatedAt))
    .limit(20);

  return <AppShell projects={rows}>{children}</AppShell>;
}

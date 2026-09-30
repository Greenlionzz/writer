import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function badRequest(message: string, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, 400);
}

export function unauthorized() {
  return json({ error: "You must be signed in." }, 401);
}

export function notFound(message = "Not found.") {
  return json({ error: message }, 404);
}

export function serverError(message = "Something went wrong.") {
  return json({ error: message }, 500);
}

export async function getOwnedProject(projectId: string, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  return project ?? null;
}

import type { Metadata } from "next";
import { NewProjectForm } from "@/components/new-project-form";

export const metadata: Metadata = { title: "New project — Fabula" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <p className="text-xs font-semibold tracking-[0.2em] text-brass uppercase">New project</p>
      <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-cream sm:text-4xl">
        What are we writing?
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-faded">
        Give your story a home. You can shape everything else — structure, cast, lore —
        once you’re inside.
      </p>
      <div className="mt-8">
        <NewProjectForm />
      </div>
    </div>
  );
}

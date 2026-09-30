import { BookCopy, Clapperboard, Layers, Library, NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof NotebookPen> = {
  novel: NotebookPen,
  trilogy: Library,
  series: Layers,
  stories: BookCopy,
  screenplay: Clapperboard,
};

export function TypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = ICONS[type] ?? NotebookPen;
  return <Icon className={cn("h-4 w-4", className)} />;
}

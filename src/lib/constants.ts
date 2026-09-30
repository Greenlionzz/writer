export const PROJECT_TYPES = [
  { id: "novel", label: "Novel" },
  { id: "trilogy", label: "Trilogy" },
  { id: "series", label: "Series" },
  { id: "stories", label: "Story Collection" },
  { id: "screenplay", label: "Screenplay" },
] as const;

export const PROJECT_STATUSES = [
  { id: "draft", label: "Draft" },
  { id: "in-progress", label: "In Progress" },
  { id: "complete", label: "Complete" },
  { id: "shelved", label: "Shelved" },
] as const;

export const CODEX_KINDS = [
  { id: "character", label: "Characters" },
  { id: "location", label: "Locations" },
  { id: "lore", label: "Lore" },
  { id: "plot", label: "Plot Points" },
] as const;

export const NODE_KINDS = {
  premise: {
    label: "Premise",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.14)",
    childLabel: "acts",
    defaultCount: 3,
  },
  act: {
    label: "Act",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.14)",
    childLabel: "chapters",
    defaultCount: 3,
  },
  chapter: {
    label: "Chapter",
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.14)",
    childLabel: "scenes",
    defaultCount: 4,
  },
  scene: {
    label: "Scene",
    color: "#34d399",
    bg: "rgba(52,211,153,0.14)",
    childLabel: null,
    defaultCount: 0,
  },
} as const;

export function projectTypeLabel(id: string) {
  return PROJECT_TYPES.find((t) => t.id === id)?.label ?? id;
}

export function projectStatusLabel(id: string) {
  return PROJECT_STATUSES.find((s) => s.id === id)?.label ?? id;
}

export function codexKindLabel(id: string) {
  return CODEX_KINDS.find((k) => k.id === id)?.label ?? id;
}

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import dagre from "dagre";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  Handle,
  Position,
  applyNodeChanges,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  type NodeChange,
} from "@xyflow/react";
import {
  BookOpen,
  LayoutGrid,
  LoaderCircle,
  Maximize,
  Network,
  PenLine,
  Plus,
  Sparkles,
  Sprout,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import "@xyflow/react/dist/style.css";
import { api, ApiError } from "@/lib/client-api";
import { Badge, Button, ConfirmDialog, Textarea, Select } from "@/components/ui";
import { ProjectHeader, type HeaderProject } from "@/components/project-header";
import { NODE_KINDS } from "@/lib/constants";
import { childKind, cn } from "@/lib/utils";

export type SerializedNode = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  parentId: string | null;
  chapterId: string | null;
};

type NodeData = { node: SerializedNode; generating: boolean };
type StoryFlowNode = Node<NodeData, "story">;

type Handlers = {
  expand: (node: SerializedNode, count?: number, directive?: string) => void;
  promote: (node: SerializedNode) => void;
  openChapter: (chapterId: string) => void;
};
const HandlersContext = createContext<Handlers | null>(null);

function kindMeta(kind: string) {
  return (
    NODE_KINDS[kind as keyof typeof NODE_KINDS] ?? NODE_KINDS.premise
  );
}

/* ---------------- Custom node card ---------------- */
function StoryNodeCard({ data, selected }: NodeProps<StoryFlowNode>) {
  const h = useContext(HandlersContext);
  const n = data.node;
  const meta = kindMeta(n.kind);
  const child = childKind(n.kind);

  return (
    <div
      className={cn(
        "group relative w-72 overflow-visible rounded-xl border bg-panel text-left shadow-xl shadow-black/45 transition-all duration-200",
        selected
          ? "border-brass/70 ring-2 ring-brass/25"
          : "border-hairline hover:border-stone-500",
        data.generating && "animate-pulse-soft border-brass/60"
      )}
    >
      <Handle type="target" position={Position.Top} />
      <div
        className="pointer-events-none absolute inset-x-3 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${meta.color}66, transparent)` }}
      />
      <div className="flex items-center gap-2 border-b border-hairline px-3.5 py-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
        <span className="text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: meta.color }}>
          {meta.label}
        </span>
        {n.chapterId && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-px text-[9.5px] font-semibold text-emerald-300">
            <BookOpen className="h-2.5 w-2.5" />
            In manuscript
          </span>
        )}
        {data.generating && <LoaderCircle className="ml-auto h-3.5 w-3.5 animate-spin text-brass" />}
      </div>
      <div className="px-3.5 py-2.5">
        <p className="font-display line-clamp-2 text-[15px] leading-snug font-semibold text-cream">
          {n.title}
        </p>
        {n.summary && (
          <p className="mt-1 line-clamp-3 text-[11.5px] leading-relaxed text-faded">{n.summary}</p>
        )}
      </div>

      {/* Hover quick actions */}
      <div className="pointer-events-none absolute -bottom-3 right-2.5 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {child && (
          <button
            title={`Grow ${kindMeta(child).label.toLowerCase()}s with AI`}
            onClick={(e) => {
              e.stopPropagation();
              h?.expand(n);
            }}
            className="pointer-events-auto flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-brass/50 bg-ink text-brass shadow-lg hover:bg-brass hover:text-ink"
          >
            <Sparkles className="h-3 w-3" />
          </button>
        )}
        {n.kind === "chapter" && !n.chapterId && (
          <button
            title="Promote to manuscript"
            onClick={(e) => {
              e.stopPropagation();
              h?.promote(n);
            }}
            className="pointer-events-auto flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-sky-400/50 bg-ink text-sky-300 shadow-lg hover:bg-sky-300 hover:text-ink"
          >
            <PenLine className="h-3 w-3" />
          </button>
        )}
        {n.chapterId && (
          <button
            title="Open in manuscript"
            onClick={(e) => {
              e.stopPropagation();
              h?.openChapter(n.chapterId!);
            }}
            className="pointer-events-auto flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-emerald-400/50 bg-ink text-emerald-300 shadow-lg hover:bg-emerald-300 hover:text-ink"
          >
            <BookOpen className="h-3 w-3" />
          </button>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { story: StoryNodeCard };

/* ---------------- Dagre layout ---------------- */
const NODE_W = 288;
const NODE_H = 158;

function computePositions(storyNodes: SerializedNode[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 88, marginx: 32, marginy: 32 });
  for (const n of storyNodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const n of storyNodes) if (n.parentId) g.setEdge(n.parentId, n.id);
  dagre.layout(g);
  const map = new Map<string, { x: number; y: number }>();
  for (const n of storyNodes) {
    const p = g.node(n.id);
    map.set(n.id, { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 });
  }
  return map;
}

/* ---------------- Canvas ---------------- */
function Canvas({
  project,
  storyNodes,
  setStoryNodes,
  hasKey,
  selectedId,
  setSelectedId,
  registerExpand,
}: {
  project: HeaderProject;
  storyNodes: SerializedNode[];
  setStoryNodes: React.Dispatch<React.SetStateAction<SerializedNode[]>>;
  hasKey: boolean;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  registerExpand?: React.MutableRefObject<((node: SerializedNode) => void) | null>;
}) {
  const router = useRouter();
  const rf = useReactFlow();
  const [rfNodes, setRfNodes] = useState<StoryFlowNode[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [deletingNode, setDeletingNode] = useState<SerializedNode | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const buildFlowNodes = useCallback((): StoryFlowNode[] => {
    const layout = computePositions(storyNodes);
    return storyNodes.map((n) => ({
      id: n.id,
      type: "story",
      position: overrides[n.id] ?? layout.get(n.id) ?? { x: 0, y: 0 },
      data: { node: n, generating: generatingId === n.id },
      selected: n.id === selectedId,
    }));
  }, [storyNodes, overrides, generatingId, selectedId]);

  useEffect(() => {
    setRfNodes(buildFlowNodes());
  }, [buildFlowNodes]);

  const edges: Edge[] = useMemo(
    () =>
      storyNodes
        .filter((n) => n.parentId)
        .map((n) => ({
          id: `e-${n.parentId}-${n.id}`,
          source: n.parentId!,
          target: n.id,
          type: "smoothstep",
        })),
    [storyNodes]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<StoryFlowNode>[]) =>
      setRfNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const expand = useCallback(
    async (node: SerializedNode, count?: number, directive?: string) => {
      if (generatingId) return;
      const target = childKind(node.kind);
      if (!target) return;
      if (!hasKey) {
        toast.error("Connect an AI provider to grow your story map.", {
          action: { label: "Open Settings", onClick: () => router.push("/settings") },
        });
        return;
      }
      setGeneratingId(node.id);
      const t = toast.loading(`Growing ${kindMeta(target).label.toLowerCase()}s beneath “${node.title}”…`);
      try {
        const res = await api<{ nodes: SerializedNode[]; meta: { provider: string; model: string } }>(
          `/api/projects/${project.id}/generate`,
          { method: "POST", body: { nodeId: node.id, count, directive } }
        );
        setStoryNodes((ns) => [...ns, ...res.nodes]);
        toast.success(
          `${res.nodes.length} ${kindMeta(target).label.toLowerCase()}${res.nodes.length === 1 ? "" : "s"} grew on the map · ${res.meta.provider} ${res.meta.model}`,
          { id: t }
        );
        setTimeout(() => rf.fitView({ padding: 0.16, duration: 450 }), 60);
      } catch (err) {
        toast.dismiss(t);
        if (err instanceof ApiError && err.code === "NO_API_KEY") {
          toast.error(err.message, {
            action: { label: "Open Settings", onClick: () => router.push("/settings") },
          });
        } else {
          toast.error(err instanceof ApiError ? err.message : "Generation failed.");
        }
      } finally {
        setGeneratingId(null);
      }
    },
    [generatingId, hasKey, project.id, router, rf, setStoryNodes]
  );

  const promote = useCallback(
    async (node: SerializedNode) => {
      if (promotingId) return;
      setPromotingId(node.id);
      try {
        const res = await api<{ chapter: { id: string; title: string }; already?: boolean }>(
          `/api/nodes/${node.id}/promote`,
          { method: "POST" }
        );
        if (res.already) {
          router.push(`/projects/${project.id}/write/${res.chapter.id}`);
          return;
        }
        setStoryNodes((ns) =>
          ns.map((x) =>
            x.id === node.id ? { ...x, chapterId: res.chapter.id } : x
          )
        );
        toast.success(`“${res.chapter.title}” is now in your manuscript — scene beats included.`, {
          action: {
            label: "Start writing",
            onClick: () => router.push(`/projects/${project.id}/write/${res.chapter.id}`),
          },
        });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Could not promote the chapter.");
      } finally {
        setPromotingId(null);
      }
    },
    [promotingId, project.id, router, setStoryNodes]
  );

  const openChapter = useCallback(
    (chapterId: string) => router.push(`/projects/${project.id}/write/${chapterId}`),
    [project.id, router]
  );

  const handlers = useMemo<Handlers>(
    () => ({ expand, promote, openChapter }),
    [expand, promote, openChapter]
  );

  useEffect(() => {
    if (registerExpand) registerExpand.current = expand;
  }, [expand, registerExpand]);

  function descendants(id: string): Set<string> {
    const out = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of storyNodes) {
        if (n.parentId && out.has(n.parentId) && !out.has(n.id)) {
          out.add(n.id);
          changed = true;
        }
      }
    }
    return out;
  }

  async function confirmDelete() {
    if (!deletingNode) return;
    setDeleteLoading(true);
    const doomed = descendants(deletingNode.id);
    const prev = storyNodes;
    setStoryNodes((ns) => ns.filter((n) => !doomed.has(n.id)));
    if (selectedId && doomed.has(selectedId)) setSelectedId(null);
    try {
      await api(`/api/nodes/${deletingNode.id}`, { method: "DELETE" });
      toast.success(`Removed ${doomed.size} node${doomed.size === 1 ? "" : "s"} from the map.`);
      setDeletingNode(null);
    } catch {
      setStoryNodes(prev);
      toast.error("Could not delete the node.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function addChildManually(parent: SerializedNode, title: string, summary: string) {
    const kind = childKind(parent.kind);
    if (!kind) return;
    try {
      const { node } = await api<{ node: SerializedNode }>(`/api/projects/${project.id}/nodes`, {
        method: "POST",
        body: { kind, parentId: parent.id, title, summary },
      });
      setStoryNodes((ns) => [...ns, node]);
      toast.success(`${kindMeta(kind).label} added.`);
      setTimeout(() => rf.fitView({ padding: 0.2, duration: 400 }), 60);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add the node.");
    }
  }

  async function saveNodeEdits(id: string, title: string, summary: string) {
    const prev = storyNodes;
    setStoryNodes((ns) => ns.map((n) => (n.id === id ? { ...n, title, summary } : n)));
    try {
      await api(`/api/nodes/${id}`, { method: "PATCH", body: { title, summary } });
    } catch {
      setStoryNodes(prev);
      toast.error("Could not save the node.");
    }
  }

  const selectedNode = storyNodes.find((n) => n.id === selectedId) ?? null;

  return (
    <HandlersContext.Provider value={handlers}>
      <div className="relative h-[calc(100dvh-215px)] min-h-120 overflow-hidden rounded-2xl border border-hairline bg-ink/60 animate-fade-up">
        <ReactFlow
          nodes={rfNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          onNodeDragStop={(_, node) => {
            if (node) setOverrides((ov) => ({ ...ov, [node.id]: { ...node.position } }));
          }}
          fitView
          fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
        >
          <Background variant={BackgroundVariant.Dots} gap={26} size={1.5} color="#2a251d" />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            position="bottom-left"
            pannable
            zoomable
            bgColor="#131110"
            maskColor="rgba(11,10,8,0.7)"
            nodeColor={(n) => kindMeta((n as StoryFlowNode).data?.node?.kind ?? "premise").color}
            className="hidden sm:block"
          />
          <Panel position="top-left">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOverrides({});
                  setTimeout(() => rf.fitView({ padding: 0.18, duration: 400 }), 40);
                }}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Auto-layout
              </Button>
              <Button variant="outline" size="sm" onClick={() => rf.fitView({ padding: 0.18, duration: 400 })}>
                <Maximize className="h-3.5 w-3.5" />
                Fit
              </Button>
            </div>
          </Panel>
          <Panel position="top-right">
            <div className="hidden gap-3 rounded-lg border border-hairline bg-panel/90 px-3.5 py-2 backdrop-blur sm:flex">
              {(["premise", "act", "chapter", "scene"] as const).map((k) => (
                <span key={k} className="flex items-center gap-1.5 text-[10.5px] font-medium tracking-wide text-faded uppercase">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: kindMeta(k).color }} />
                  {kindMeta(k).label}
                </span>
              ))}
            </div>
          </Panel>
        </ReactFlow>

        {selectedNode && (
          <Inspector
            key={selectedNode.id}
            node={selectedNode}
            generating={generatingId === selectedNode.id}
            promoting={promotingId === selectedNode.id}
            onClose={() => setSelectedId(null)}
            onSave={saveNodeEdits}
            onExpand={expand}
            onPromote={promote}
            onOpenChapter={openChapter}
            onAddChild={addChildManually}
            onDelete={() => setDeletingNode(selectedNode)}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deletingNode}
        onClose={() => setDeletingNode(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title={`Delete “${deletingNode?.title}”?`}
        message={`This removes the node and everything grown beneath it${
          deletingNode ? ` (${descendants(deletingNode.id).size} nodes)` : ""
        }. Promoted chapters stay in your manuscript.`}
        confirmLabel="Delete nodes"
      />
    </HandlersContext.Provider>
  );
}

/* ---------------- Inspector panel ---------------- */
function Inspector({
  node,
  generating,
  promoting,
  onClose,
  onSave,
  onExpand,
  onPromote,
  onOpenChapter,
  onAddChild,
  onDelete,
}: {
  node: SerializedNode;
  generating: boolean;
  promoting: boolean;
  onClose: () => void;
  onSave: (id: string, title: string, summary: string) => void;
  onExpand: (node: SerializedNode, count?: number, directive?: string) => void;
  onPromote: (node: SerializedNode) => void;
  onOpenChapter: (chapterId: string) => void;
  onAddChild: (parent: SerializedNode, title: string, summary: string) => void;
  onDelete: () => void;
}) {
  const meta = kindMeta(node.kind);
  const child = childKind(node.kind);
  const [title, setTitle] = useState(node.title);
  const [summary, setSummary] = useState(node.summary);
  const [count, setCount] = useState<number>(meta.defaultCount || 3);
  const [directive, setDirective] = useState("");
  const [addingChild, setAddingChild] = useState(false);
  const [childTitle, setChildTitle] = useState("");
  const [childSummary, setChildSummary] = useState("");
  const dirty = title !== node.title || summary !== node.summary;

  function blurSave() {
    if (dirty && title.trim()) onSave(node.id, title.trim(), summary);
  }

  return (
    <aside className="absolute inset-y-3 right-3 z-20 flex w-88 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border border-hairline bg-panel/98 shadow-2xl shadow-black/60 backdrop-blur animate-fade-up">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
        <span className="text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: meta.color }}>
          {meta.label}
        </span>
        {node.chapterId && (
          <Badge tone="emerald" className="ml-1">
            <BookOpen className="h-2.5 w-2.5" /> In manuscript
          </Badge>
        )}
        <button
          onClick={onClose}
          className="ml-auto rounded-md px-2 py-1 text-xs text-faded hover:bg-lift hover:text-cream"
        >
          Close
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <label className="mb-1 block text-[10px] font-semibold tracking-wider text-faded uppercase">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={blurSave}
            className="w-full rounded-lg border border-hairline bg-black/30 px-3 py-2 font-display text-[15px] font-semibold text-cream focus:border-brass/60 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold tracking-wider text-faded uppercase">
            Summary {dirty && <span className="ml-1 text-brass normal-case">· unsaved</span>}
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onBlur={blurSave}
            rows={4}
            placeholder="What happens at this beat?"
            className="w-full resize-y rounded-lg border border-hairline bg-black/30 px-3 py-2 text-[13px] leading-relaxed text-stone-200 placeholder:text-stone-600 focus:border-brass/60 focus:outline-none"
          />
        </div>

        {child && (
          <div className="rounded-xl border border-brass/20 bg-brass/5 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brass-bright">
              <Sparkles className="h-3.5 w-3.5" />
              Grow {kindMeta(child).label.toLowerCase()}s with AI
            </p>
            <div className="mt-3 flex items-end gap-2">
              <Select
                label="How many"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full"
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <Textarea
              label="Directive (optional)"
              rows={2}
              value={directive}
              onChange={(e) => setDirective(e.target.value)}
              placeholder="e.g. lean harder into the rivalry; give act two a betrayal"
              className="mt-3 text-[13px]"
            />
            <Button
              className="mt-3 w-full"
              size="sm"
              loading={generating}
              onClick={() => onExpand(node, count, directive.trim() || undefined)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Grow {count} {kindMeta(child).label.toLowerCase()}s
            </Button>
          </div>
        )}

        {child && (
          <div>
            {!addingChild ? (
              <button
                onClick={() => setAddingChild(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-hairline px-3 py-2.5 text-xs font-medium text-faded transition-colors hover:border-brass/40 hover:text-brass"
              >
                <Plus className="h-3.5 w-3.5" />
                Add a {kindMeta(child).label.toLowerCase()} by hand
              </button>
            ) : (
              <div className="space-y-2.5 rounded-xl border border-hairline bg-black/20 p-3.5">
                <input
                  value={childTitle}
                  onChange={(e) => setChildTitle(e.target.value)}
                  placeholder={`${kindMeta(child).label} title`}
                  className="w-full rounded-md border border-hairline bg-black/30 px-2.5 py-2 text-sm text-cream focus:border-brass/60 focus:outline-none"
                />
                <textarea
                  value={childSummary}
                  onChange={(e) => setChildSummary(e.target.value)}
                  rows={2}
                  placeholder="Short summary"
                  className="w-full rounded-md border border-hairline bg-black/30 px-2.5 py-2 text-[13px] text-stone-200 focus:border-brass/60 focus:outline-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (!childTitle.trim()) return;
                      onAddChild(node, childTitle.trim(), childSummary.trim());
                      setChildTitle("");
                      setChildSummary("");
                      setAddingChild(false);
                    }}
                  >
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingChild(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-hairline p-3.5">
        {node.kind === "chapter" && !node.chapterId && (
          <Button variant="outline" className="w-full border-sky-400/40 text-sky-300 hover:border-sky-300" loading={promoting} onClick={() => onPromote(node)}>
            <PenLine className="h-4 w-4" />
            Promote to manuscript
          </Button>
        )}
        {node.chapterId && (
          <Button variant="outline" className="w-full border-emerald-400/40 text-emerald-300 hover:border-emerald-300" onClick={() => onOpenChapter(node.chapterId!)}>
            <BookOpen className="h-4 w-4" />
            Continue writing this chapter
          </Button>
        )}
        {node.kind !== "premise" && (
          <Button variant="ghost" className="w-full text-stone-500 hover:text-red-300" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete this branch
          </Button>
        )}
      </div>
    </aside>
  );
}

/* ---------------- Root client ---------------- */
export function StoryMapClient({
  project,
  initialNodes,
  hasKey,
}: {
  project: HeaderProject;
  initialNodes: SerializedNode[];
  hasKey: boolean;
}) {
  const router = useRouter();
  const [storyNodes, setStoryNodes] = useState<SerializedNode[]>(initialNodes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [premise, setPremise] = useState(project.premise || "");
  const [planting, setPlanting] = useState(false);
  const expandRef = useRef<((node: SerializedNode) => void) | null>(null);

  async function plantPremise() {
    const sentence = premise.trim();
    if (!sentence) return;
    setPlanting(true);
    try {
      const { node } = await api<{ node: SerializedNode }>(`/api/projects/${project.id}/nodes`, {
        method: "POST",
        body: { kind: "premise", title: sentence },
      });
      setStoryNodes([node]);
      setSelectedId(node.id);
      toast.success("Premise planted. Now grow acts beneath it.");
      if (hasKey) {
        setTimeout(() => expandRef.current?.(node), 700);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not plant the premise.");
    } finally {
      setPlanting(false);
    }
  }

  return (
    <div>
      <ProjectHeader project={project} />
      {storyNodes.length === 0 ? (
        <div className="flex min-h-105 flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-panel/40 px-6 py-16 text-center animate-fade-up">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-brass/30 bg-brass/10">
            <Sprout className="h-6 w-6 text-brass" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-cream">Plant your premise</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-faded">
            Describe your story in a single sentence. Fabula will grow it into
            acts, chapters and scenes — each a node you can prune, guide and
            promote into your manuscript.
          </p>
          <div className="mt-6 w-full max-w-lg">
            <textarea
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
              rows={3}
              autoFocus
              placeholder="A disgraced cartographer discovers a lighthouse that shines between star systems — and the map it keeps is alive."
              className="w-full rounded-xl border border-hairline bg-black/30 px-4 py-3 text-[15px] leading-relaxed text-cream placeholder:text-stone-600 focus:border-brass/60 focus:ring-2 focus:ring-brass/15 focus:outline-none"
            />
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button size="lg" onClick={plantPremise} loading={planting} disabled={!premise.trim()}>
                <Network className="h-4 w-4" />
                Plant premise{hasKey ? " & grow acts" : ""}
              </Button>
              {!hasKey && (
                <Button variant="ghost" onClick={() => router.push("/settings")} className="text-brass">
                  Connect an AI key first
                </Button>
              )}
            </div>
            {hasKey && (
              <p className="mt-3 text-[11px] text-stone-500">
                After planting, AI will automatically draft your first act structure.
              </p>
            )}
          </div>
        </div>
      ) : (
        <ReactFlowProvider>
          <Canvas
            project={project}
            storyNodes={storyNodes}
            setStoryNodes={setStoryNodes}
            hasKey={hasKey}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            registerExpand={expandRef}
          />
        </ReactFlowProvider>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";

export type WarehouseGraphNode = { id: string; name: string; parentId: string | null; active: boolean; itemCount: number };

type PositionedNode = WarehouseGraphNode & { x: number; y: number; depth: number; children: PositionedNode[] };

const NODE_W = 168;
const NODE_H = 64;
const GAP_X = 16;
const GAP_Y = 56;
const PADDING = 32;

// Classic "tidy tree" layout: leaves get sequential slots left-to-right,
// and every parent sits centered over the span of its own children — a
// single pass, no overlap possible by construction as long as siblings are
// visited in a stable order. Multiple top-level locations (the common case
// today — most locations have no parent yet) just fall into the same
// left-to-right sequence as if they were siblings under an invisible root,
// so a flat location list still renders as a tidy single-row diagram.
function layout(nodes: WarehouseGraphNode[]): { positioned: PositionedNode[]; width: number; height: number } {
  const byParent = new Map<string | null, WarehouseGraphNode[]>();
  for (const n of nodes) {
    const key = n.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(n);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.name.localeCompare(b.name));

  const positionedById = new Map<string, PositionedNode>();
  let cursor = 0;
  let maxDepth = 0;

  function visit(node: WarehouseGraphNode, depth: number): PositionedNode {
    maxDepth = Math.max(maxDepth, depth);
    const kids = (byParent.get(node.id) ?? []).map((k) => visit(k, depth + 1));
    const x =
      kids.length > 0
        ? (kids[0].x + kids[kids.length - 1].x) / 2
        : cursor++ * (NODE_W + GAP_X);
    const positioned: PositionedNode = { ...node, x, y: depth * (NODE_H + GAP_Y), depth, children: kids };
    positionedById.set(node.id, positioned);
    return positioned;
  }

  for (const root of byParent.get(null) ?? []) visit(root, 0);
  const width = Math.max(NODE_W, cursor * (NODE_W + GAP_X) - GAP_X) + PADDING * 2;
  const height = (maxDepth + 1) * NODE_H + maxDepth * GAP_Y + PADDING * 2;

  return { positioned: Array.from(positionedById.values()), width, height };
}

function elbowPath(parent: PositionedNode, child: PositionedNode) {
  const px = parent.x + NODE_W / 2 + PADDING;
  const py = parent.y + NODE_H + PADDING;
  const cx = child.x + NODE_W / 2 + PADDING;
  const cy = child.y + PADDING;
  const midY = (py + cy) / 2;
  return `M ${px} ${py} V ${midY} H ${cx} V ${cy}`;
}

// Same glyph-per-level idea as WarehouseTree's LocationIcon (depth 0 =
// building, depth 1 = room, depth 2+ = shelf) so the two views read as one
// consistent vocabulary rather than two unrelated designs of the same data.
function LocationIcon({ depth }: { depth: number }) {
  if (depth === 0) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" />
      </svg>
    );
  }
  if (depth === 1) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="1.5" />
        <path d="M3 10h18M9 10v10" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16M4 6v.01M4 12v.01M4 18v.01" />
    </svg>
  );
}

export default function WarehouseHierarchyGraph({ nodes }: { nodes: WarehouseGraphNode[] }) {
  const router = useRouter();
  const { positioned, width, height } = useMemo(() => layout(nodes), [nodes]);
  const edges = useMemo(() => positioned.flatMap((p) => p.children.map((c) => ({ parent: p, child: c }))), [positioned]);

  if (nodes.length === 0) {
    return <EmptyState>No warehouse locations yet — add one above.</EmptyState>;
  }

  return (
    <div className="rounded-[20px] border border-border bg-white shadow-card overflow-auto">
      <div className="relative" style={{ width, height, minWidth: "100%" }}>
        <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
          {edges.map(({ parent, child }) => (
            <path key={`${parent.id}-${child.id}`} d={elbowPath(parent, child)} fill="none" stroke="#CBD8DF" strokeWidth={2} strokeLinejoin="round" />
          ))}
        </svg>

        {positioned.map((node, i) => (
          <button
            key={node.id}
            type="button"
            onClick={() => router.push(`/inventory/warehouse/${node.id}`)}
            style={
              {
                position: "absolute",
                left: node.x + PADDING,
                top: node.y + PADDING,
                width: NODE_W,
                height: NODE_H,
                "--stagger": i,
              } as React.CSSProperties
            }
            className="stagger-item text-left rounded-[14px] border border-border bg-white shadow-card-sm px-3.5 flex items-center gap-2.5 cursor-pointer transition-shadow hover:shadow-card active:scale-95"
          >
            <div className="w-8 h-8 rounded-[10px] bg-primary-soft flex items-center justify-center shrink-0">
              <LocationIcon depth={node.depth} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text truncate">{node.name}</div>
              <div className="text-[11px] text-muted mt-0.5">
                {node.itemCount} item{node.itemCount === 1 ? "" : "s"}
                {!node.active && <span className="ml-1 font-semibold text-danger">(inactive)</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

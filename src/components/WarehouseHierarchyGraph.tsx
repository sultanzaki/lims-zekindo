"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";

export type WarehouseGraphNode = { id: string; name: string; parentId: string | null; active: boolean; itemCount: number };

type PositionedNode = WarehouseGraphNode & { x: number; y: number; children: PositionedNode[] };

const NODE_W = 148;
const NODE_H = 60;
const GAP_X = 26;
const GAP_Y = 56;
const PADDING = 24;

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
    const positioned: PositionedNode = { ...node, x, y: depth * (NODE_H + GAP_Y), children: kids };
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

export default function WarehouseHierarchyGraph({ nodes }: { nodes: WarehouseGraphNode[] }) {
  const router = useRouter();
  const { positioned, width, height } = useMemo(() => layout(nodes), [nodes]);
  const edges = useMemo(() => positioned.flatMap((p) => p.children.map((c) => ({ parent: p, child: c }))), [positioned]);

  if (nodes.length === 0) {
    return <EmptyState>No warehouse locations yet — add one above.</EmptyState>;
  }

  return (
    <div className="rounded-[20px] border border-border bg-white overflow-auto">
      <div className="relative" style={{ width, height, minWidth: "100%" }}>
        <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
          {edges.map(({ parent, child }) => (
            <path key={`${parent.id}-${child.id}`} d={elbowPath(parent, child)} fill="none" stroke="#D8E2E7" strokeWidth={1.75} strokeLinejoin="round" />
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
            className={`stagger-item text-left rounded-[10px] border bg-white shadow-card-sm px-3 py-2 flex flex-col justify-center gap-0.5 cursor-pointer transition-shadow hover:shadow-card active:scale-95 ${
              node.active ? "border-border" : "border-dashed border-faint opacity-60"
            }`}
          >
            <span className="text-[12px] font-semibold text-text truncate">{node.name}</span>
            <span className="text-[10.5px] text-muted">
              {node.itemCount} item{node.itemCount === 1 ? "" : "s"}
              {!node.active && " · inactive"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

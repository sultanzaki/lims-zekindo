import { prisma } from "@/lib/db";

// Helpers for the nestable StorageLocation tree (e.g. "KBI" > "Microbiology
// Lab" > "Rak X"). Locations are fetched flat from Prisma and assembled into
// a tree here, since the depth is unbounded and small in practice.

export type LocationNode = {
  id: string;
  name: string;
  parentId: string | null;
  active: boolean;
  notes: string | null;
  directReagents: number;
  directEquipment: number;
};

const MAX_DEPTH = 20; // guards against a corrupted/cyclic parent chain

export function buildLocationTree(locations: LocationNode[]) {
  const byId = new Map(locations.map((l) => [l.id, l]));
  const childMap = new Map<string | null, LocationNode[]>();
  for (const loc of locations) {
    const key = loc.parentId;
    if (!childMap.has(key)) childMap.set(key, []);
    childMap.get(key)!.push(loc);
  }
  for (const list of childMap.values()) list.sort((a, b) => a.name.localeCompare(b.name));

  function childrenOf(id: string | null): LocationNode[] {
    return childMap.get(id) ?? [];
  }

  const totalCache = new Map<string, number>();
  function totalItems(id: string): number {
    if (totalCache.has(id)) return totalCache.get(id)!;
    const loc = byId.get(id);
    if (!loc) return 0;
    let total = loc.directReagents + loc.directEquipment;
    for (const child of childrenOf(id)) total += totalItems(child.id);
    totalCache.set(id, total);
    return total;
  }

  function subLocationCount(id: string): number {
    let count = 0;
    for (const child of childrenOf(id)) count += 1 + subLocationCount(child.id);
    return count;
  }

  function ancestorsOf(id: string): LocationNode[] {
    const chain: LocationNode[] = [];
    let cur = byId.get(id);
    let guard = 0;
    while (cur?.parentId && guard++ < MAX_DEPTH) {
      const parent = byId.get(cur.parentId);
      if (!parent) break;
      chain.unshift(parent);
      cur = parent;
    }
    return chain;
  }

  function pathFor(id: string): string {
    const loc = byId.get(id);
    if (!loc) return "";
    return [...ancestorsOf(id), loc].map((l) => l.name).join(" › ");
  }

  // All descendant ids of `id`, not including itself — used to stop a
  // location from being moved under its own descendant.
  function descendantIdsOf(id: string): Set<string> {
    const out = new Set<string>();
    function walk(nodeId: string) {
      for (const child of childrenOf(nodeId)) {
        out.add(child.id);
        walk(child.id);
      }
    }
    walk(id);
    return out;
  }

  return { byId, childrenOf, totalItems, subLocationCount, ancestorsOf, pathFor, descendantIdsOf };
}

// Flattened, depth-ordered list for populating a <select> — parents appear
// immediately before their children, each label indented by depth.
export function flattenForSelect(
  locations: LocationNode[],
  options: { activeOnly?: boolean; excludeId?: string } = {}
): { id: string; label: string }[] {
  const tree = buildLocationTree(locations);
  const excludedIds = options.excludeId
    ? new Set([options.excludeId, ...tree.descendantIdsOf(options.excludeId)])
    : null;
  const out: { id: string; label: string }[] = [];

  function walk(parentId: string | null, depth: number) {
    for (const loc of tree.childrenOf(parentId)) {
      if (excludedIds?.has(loc.id)) continue;
      if (options.activeOnly && !loc.active) continue;
      const indent = "  ".repeat(depth);
      const prefix = depth > 0 ? "› " : "";
      out.push({ id: loc.id, label: `${indent}${prefix}${loc.name}` });
      walk(loc.id, depth + 1);
    }
  }
  walk(null, 0);
  return out;
}

// Breadcrumb path for a single location, walking up via its own parentId
// chain — used on detail pages that only need one location's path rather
// than the whole tree.
export async function pathForLocationId(locationId: string): Promise<string> {
  const parts: string[] = [];
  let currentId: string | null = locationId;
  let guard = 0;
  while (currentId && guard++ < MAX_DEPTH) {
    const loc: { name: string; parentId: string | null } | null = await prisma.storageLocation.findUnique({
      where: { id: currentId },
      select: { name: true, parentId: true },
    });
    if (!loc) break;
    parts.unshift(loc.name);
    currentId = loc.parentId;
  }
  return parts.join(" › ");
}

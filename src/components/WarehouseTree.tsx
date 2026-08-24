import Link from "next/link";
import type { buildLocationTree } from "@/lib/warehouse";
import { setStorageLocationActiveAction } from "@/lib/actions/warehouse";
import Chevron from "@/components/ui/Chevron";

type Tree = ReturnType<typeof buildLocationTree>;

function LocationIcon({ depth }: { depth: number }) {
  // Depth 0 = building, depth 1 = room, depth 2+ = shelf/rack — a distinct
  // glyph per level makes the hierarchy readable at a glance, not just indentation.
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

function TreeRow({ tree, id, depth }: { tree: Tree; id: string; depth: number }) {
  const loc = tree.byId.get(id);
  if (!loc) return null;
  const itemCount = tree.totalItems(id);
  const subCount = tree.subLocationCount(id);
  const children = tree.childrenOf(id);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex items-center gap-3">
        {depth > 0 && <span className="absolute -left-[15px] top-1/2 w-[15px] h-[2px] bg-border-soft" aria-hidden />}
        <div className="flex-1 min-w-0 bg-white border border-border rounded-[14px] shadow-card-sm px-3.5 py-3 flex items-center gap-2.5">
          <Link href={`/inventory/warehouse/${loc.id}`} className="flex-1 min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-primary-soft flex items-center justify-center shrink-0">
              <LocationIcon depth={depth} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-text truncate">{loc.name}</span>
                {!loc.active && <span className="text-[10px] font-semibold text-danger shrink-0">(inactive)</span>}
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                {subCount > 0 && `${subCount} sub-location${subCount === 1 ? "" : "s"} · `}
                {itemCount} item{itemCount === 1 ? "" : "s"}
                {loc.notes && ` · ${loc.notes}`}
              </div>
            </div>
          </Link>
          <form action={setStorageLocationActiveAction.bind(null, loc.id, !loc.active)} className="shrink-0">
            <button
              type="submit"
              className={`text-[11px] font-semibold cursor-pointer ${loc.active ? "text-danger" : "text-success-dark"}`}
            >
              {loc.active ? "Deactivate" : "Reactivate"}
            </button>
          </form>
          <Link href={`/inventory/warehouse/${loc.id}`} className="shrink-0" aria-label={`View ${loc.name}`}>
            <Chevron />
          </Link>
        </div>
      </div>

      {children.length > 0 && (
        <div className="ml-4 pl-4 border-l-2 border-border-soft flex flex-col gap-2">
          {children.map((c) => (
            <TreeRow key={c.id} tree={tree} id={c.id} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// Renders the whole warehouse as a nested hierarchy (e.g. KBI > Microbiology
// Lab > Rak X) in one view, instead of requiring a click-through per level.
export default function WarehouseTree({ tree }: { tree: Tree }) {
  const roots = tree.childrenOf(null);
  return (
    <div className="flex flex-col gap-2">
      {roots.map((loc) => (
        <TreeRow key={loc.id} tree={tree} id={loc.id} depth={0} />
      ))}
    </div>
  );
}

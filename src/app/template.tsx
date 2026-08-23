import { ViewTransition } from "react";

// Remounts on every navigation (unlike layout.tsx), so this is where a
// per-page enter/exit animation belongs. Pairs with the `.page-fade`
// keyframes in globals.css — React's ViewTransition activates them via the
// browser's View Transitions API; browsers without support just swap pages
// instantly, same as before this existed.
export default function Template({ children }: { children: React.ReactNode }) {
  return <ViewTransition default="page-fade">{children}</ViewTransition>;
}

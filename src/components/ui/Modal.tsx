"use client";

import { useEffect, useState } from "react";

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "480px",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  // Kept mounted through the exit animation (see the modal-*-out keyframes
  // in globals.css) instead of unmounting the instant `open` flips false —
  // otherwise the modal would just snap away with no close motion.
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);

  // Adjust state during render when `open` changes (React's documented
  // alternative to a setState-in-effect for "reset/react to a prop change")
  // rather than reacting to it a frame later in an effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      setClosing(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!rendered) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-5 ${
        closing ? "modal-backdrop-out" : "modal-backdrop-in"
      }`}
      onClick={onClose}
      onAnimationEnd={() => {
        if (closing) setRendered(false);
      }}
    >
      <div
        className={`w-full bg-white rounded-[18px] p-4 md:p-5 flex flex-col gap-3 max-h-[85vh] overflow-y-auto ${
          closing ? "modal-panel-out" : "modal-panel-in"
        }`}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div className="text-[15px] font-bold text-text tracking-tight">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-chip-bg hover:text-text transition-colors cursor-pointer shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

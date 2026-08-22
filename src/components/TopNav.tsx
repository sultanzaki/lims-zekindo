"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOutAction } from "@/lib/actions/auth";
import { canReviewAsSupervisor, canManageInventoryAndCatalog, isAdmin } from "@/lib/roles";

type Tab = "home" | "samples" | "scan" | "notif" | "profile";

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function MenuLink({ href, label, active, badge, onNavigate }: { href: string; label: string; active?: boolean; badge?: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center justify-between px-4 py-2.5 text-[13px] font-medium ${active ? "text-primary bg-primary-soft" : "text-text hover:bg-chip-bg"}`}
    >
      <span>{label}</span>
      {badge && <span className="w-1.5 h-1.5 rounded-full bg-danger" />}
    </Link>
  );
}

export default function TopNav({
  active,
  hasUnread,
  role,
  userName,
}: {
  active: Tab;
  hasUnread: boolean;
  role: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const showManagement = canReviewAsSupervisor(role) || canManageInventoryAndCatalog(role);

  return (
    <div className="hidden md:flex sticky top-0 z-20 items-center justify-between bg-white border-b border-border px-8 h-16 shrink-0">
      <Link href="/dashboard" className="flex items-center">
        <Image src="/zekindo-logo.png" alt="Zekindo" width={118} height={26} style={{ height: 26, width: "auto" }} />
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/notifications"
          aria-label="Alerts"
          className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-chip-bg hover:text-text transition-colors"
        >
          <BellIcon />
          {hasUnread && (
            <div className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-danger border-[1.5px] border-white" />
          )}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-colors ${open ? "bg-primary-soft border-primary/30 text-primary" : "bg-chip-bg border-border text-muted hover:text-text"}`}
            aria-label="Open menu"
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>

          {open && (
          <div className="absolute right-0 top-12 w-64 bg-white border border-border rounded-xl shadow-[0_8px_28px_rgba(20,24,28,0.14)] overflow-hidden py-1.5">
            <div className="px-4 py-2 text-[11px] font-semibold text-muted uppercase tracking-wider">{userName}</div>

            <MenuLink href="/dashboard" label="Dashboard" active={active === "home"} onNavigate={close} />
            <MenuLink href="/samples" label="Samples" active={active === "samples"} onNavigate={close} />
            <MenuLink href="/scan" label="Scan Sample" active={active === "scan"} onNavigate={close} />
            <MenuLink href="/notifications" label="Alerts" active={active === "notif"} badge={hasUnread} onNavigate={close} />

            {showManagement && (
              <>
                <div className="my-1.5 border-t border-border-soft" />
                {canReviewAsSupervisor(role) && <MenuLink href="/deviations" label="Deviations" onNavigate={close} />}
                {canManageInventoryAndCatalog(role) && (
                  <>
                    <MenuLink href="/admin/catalog" label="Sample & Test Catalog" onNavigate={close} />
                    <MenuLink href="/inventory/reagents" label="Reagents" onNavigate={close} />
                    <MenuLink href="/inventory/equipment" label="Equipment" onNavigate={close} />
                  </>
                )}
                {isAdmin(role) && (
                  <>
                    <MenuLink href="/admin/users" label="Users" onNavigate={close} />
                    <MenuLink href="/admin/audit" label="Audit Log" onNavigate={close} />
                  </>
                )}
              </>
            )}

            <div className="my-1.5 border-t border-border-soft" />
            <MenuLink href="/profile" label="Profile" active={active === "profile"} onNavigate={close} />
            <MenuLink href="/profile/change-password" label="Change Password" onNavigate={close} />
            <MenuLink href="/help" label="Help & Support" onNavigate={close} />

            <div className="my-1.5 border-t border-border-soft" />
            <form action={signOutAction}>
              <button type="submit" className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-danger cursor-pointer">
                Sign Out
              </button>
            </form>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

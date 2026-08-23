"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOutAction } from "@/lib/actions/auth";
import { canReviewAsSupervisor, canManageInventoryAndCatalog, isAdmin } from "@/lib/roles";

type Tab = "home" | "samples" | "scan" | "notif" | "profile";

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 rounded-full text-[13px] font-semibold transition-colors"
      style={{
        background: active ? "#E8F4FA" : "transparent",
        color: active ? "#1A5F7A" : "#5B6B74",
      }}
    >
      {label}
    </Link>
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

function subscribeNoop() {
  return () => {};
}
function getGreetingSnapshot() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
function getGreetingServerSnapshot() {
  return null;
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return chars || "?";
}

export default function TopNav({
  active,
  unreadCount,
  role,
  userName,
}: {
  active: Tab;
  unreadCount: number;
  role: string;
  userName: string;
}) {
  const hasUnread = unreadCount > 0;
  const [open, setOpen] = useState(false);
  const greeting = useSyncExternalStore(subscribeNoop, getGreetingSnapshot, getGreetingServerSnapshot);
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
  const firstName = userName.trim().split(/\s+/)[0] ?? userName;

  return (
    <div className="hidden md:flex sticky top-0 z-20 items-center justify-between bg-white border-b border-border px-8 h-16 shrink-0 gap-6">
      <div className="flex items-center gap-7 min-w-0">
        <Link href="/dashboard" className="flex items-center shrink-0">
          <Image src="/zekindo-logo.png" alt="Zekindo" width={78} height={26} style={{ height: 26, width: "auto" }} />
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink href="/dashboard" label="Dashboard" active={active === "home"} />
          <NavLink href="/samples" label="Samples" active={active === "samples"} />
          <NavLink href="/scan" label="Scan" active={active === "scan"} />
        </nav>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className="text-[13px] text-muted whitespace-nowrap transition-opacity duration-300"
          style={{ opacity: greeting ? 1 : 0 }}
        >
          {greeting}, <span className="font-semibold text-text">{firstName}</span>
        </span>

        <Link
          href="/notifications"
          aria-label="Alerts"
          className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-chip-bg hover:text-text transition-colors"
        >
          <BellIcon />
          {hasUnread && (
            <div className="absolute top-1.5 right-2 min-w-[16px] h-4 px-1 rounded-full bg-danger border-[1.5px] border-white flex items-center justify-center text-[9px] font-bold text-white leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </div>
          )}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border cursor-pointer transition-colors ${open ? "bg-primary-soft border-primary/30" : "bg-white border-border hover:bg-chip-bg"}`}
            aria-label="Account menu"
          >
            <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center text-[12px] font-bold text-primary-dark shrink-0">
              {initialsFrom(userName)}
            </div>
            <span className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
              <ChevronDownIcon />
            </span>
          </button>

          {open && (
          <div className="menu-pop absolute right-0 top-12 w-64 max-h-[calc(100vh-88px)] overflow-y-auto bg-white border border-border rounded-[18px] shadow-[0_8px_28px_rgba(16,42,58,0.14)] py-1.5">
            <div className="px-4 py-2 text-[11px] font-semibold text-muted uppercase tracking-wider">{userName}</div>

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

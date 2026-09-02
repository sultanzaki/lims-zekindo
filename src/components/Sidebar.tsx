"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  ScanLine,
  CalendarClock,
  BarChart3,
  TriangleAlert,
  ClipboardList,
  Building2,
  Beaker,
  Wrench,
  Warehouse,
  Users,
  FileClock,
  KeyRound,
  CircleHelp,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { canReviewAsSupervisor, canManageInventoryAndCatalog, canViewAnalytics, isAdmin } from "@/lib/roles";
import { GlobalSearchDesktop } from "@/components/GlobalSearch";
import NotificationsBell from "@/components/NotificationsBell";

const EXPANDED_W = "16rem";
const COLLAPSED_W = "4.5rem";
const STORAGE_KEY = "lims-sidebar-collapsed";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function buildGroups(role: string): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: "Main",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/samples", label: "Samples", icon: FlaskConical },
        { href: "/scan", label: "Scan", icon: ScanLine },
        { href: "/calendar", label: "TAT Calendar", icon: CalendarClock },
      ],
    },
  ];

  const insights: NavItem[] = [];
  if (canViewAnalytics(role)) insights.push({ href: "/analytics", label: "Analytics", icon: BarChart3 });
  if (canReviewAsSupervisor(role)) insights.push({ href: "/deviations", label: "Deviations", icon: TriangleAlert });
  if (insights.length > 0) groups.push({ label: "Insights", items: insights });

  if (canManageInventoryAndCatalog(role)) {
    groups.push({
      label: "Catalog & Inventory",
      items: [
        { href: "/admin/catalog", label: "Sample & Test Catalog", icon: ClipboardList },
        { href: "/admin/business-units", label: "Business Units", icon: Building2 },
        { href: "/inventory/reagents", label: "Reagents & Chemicals", icon: Beaker },
        { href: "/inventory/equipment", label: "Equipment", icon: Wrench },
        { href: "/inventory/warehouse", label: "Warehouse", icon: Warehouse },
      ],
    });
  }

  if (isAdmin(role)) {
    groups.push({
      label: "Administration",
      items: [
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/audit", label: "Audit Log", icon: FileClock },
      ],
    });
  }

  return groups;
}

function isItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return chars || "?";
}

function AccountMenuAction({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-text hover:bg-chip-bg transition-colors"
    >
      <Icon size={16} className="shrink-0 text-muted" />
      {label}
    </Link>
  );
}

export default function Sidebar({
  role,
  userName,
  unreadCount,
}: {
  role: string;
  userName: string;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const groups = buildGroups(role);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", collapsed ? COLLAPSED_W : EXPANDED_W);
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
    <NotificationsBell unreadCount={unreadCount} />
    <aside
      style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
      className="no-print hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 bg-white border-r border-border z-20 transition-[width] duration-200 overflow-hidden"
    >
      <div className="flex items-center h-16 shrink-0 border-b border-border px-3.5 gap-1.5">
        {!collapsed && (
          <Link href="/dashboard" className="flex-1 min-w-0 flex items-center px-1.5">
            <Image src="/zekindo-logo.png" alt="Zekindo" width={92} height={30} style={{ height: 26, width: "auto" }} />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:bg-chip-bg hover:text-text transition-colors shrink-0 cursor-pointer ${
            collapsed ? "mx-auto" : ""
          }`}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 pt-4">
          <GlobalSearchDesktop />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-2.5 mb-1.5 text-[11px] font-semibold text-faint uppercase tracking-wider whitespace-nowrap">
                {group.label}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isItemActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`relative flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                      collapsed ? "justify-center" : ""
                    } ${active ? "bg-primary-soft text-primary-dark" : "text-muted hover:bg-chip-bg hover:text-text"}`}
                  >
                    <Icon size={18} strokeWidth={2} className="shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {item.badge && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full bg-danger shrink-0 ${collapsed ? "absolute top-2 right-2" : ""}`}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative border-t border-border p-3 shrink-0" ref={menuRef}>
        {menuOpen && (
          <div
            className={`menu-pop absolute bg-white border border-border rounded-[16px] shadow-[0_8px_28px_rgba(16,42,58,0.14)] py-1.5 overflow-hidden ${
              collapsed ? "left-[calc(100%+8px)] bottom-3 w-56" : "left-3 right-3 bottom-[64px]"
            }`}
          >
            <AccountMenuAction href="/profile/change-password" label="Reset Password" icon={KeyRound} onNavigate={close} />
            <AccountMenuAction href="/help" label="Help & Support" icon={CircleHelp} onNavigate={close} />
            <div className="my-1.5 border-t border-border-soft" />
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-[13px] font-semibold text-danger cursor-pointer"
              >
                <LogOut size={16} className="shrink-0" />
                Sign Out
              </button>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors cursor-pointer ${
            collapsed ? "justify-center" : ""
          } ${menuOpen ? "bg-primary-soft" : "hover:bg-chip-bg"}`}
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center text-[12px] font-bold text-primary-dark shrink-0">
            {initialsFrom(userName)}
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 min-w-0 text-left text-[13px] font-semibold text-text truncate">{userName}</span>
              <ChevronDown size={15} className={`text-muted transition-transform shrink-0 ${menuOpen ? "rotate-180" : ""}`} />
            </>
          )}
        </button>
      </div>
    </aside>
    </>
  );
}

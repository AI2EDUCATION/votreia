"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  ListTodo,
  Users,
  FileText,
  Settings,
  CreditCard,
  ChevronLeft,
  X,
  Sparkles,
  HelpCircle,
  BarChart3,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/agents", label: "Agents IA", icon: Bot },
  { href: "/dashboard/tasks", label: "Taches", icon: ListTodo },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/billing", label: "Facturation", icon: CreditCard },
  { href: "/dashboard/settings", label: "Parametres", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Close mobile on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile on escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-surface-100 dark:border-white/[0.06]">
        <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
          V
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-surface-900 dark:text-white">
            VotrIA
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <div
              key={item.href}
              className="relative"
              onMouseEnter={() => collapsed ? setHoveredItem(item.href) : undefined}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 shadow-sm"
                    : "text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-white/[0.04] hover:text-surface-900 dark:hover:text-surface-200"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-brand-600 dark:text-brand-400" : ""}`} />
                {!collapsed && <span>{item.label}</span>}
                {isActive && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />
                )}
              </Link>

              {/* Tooltip for collapsed state */}
              {collapsed && hoveredItem === item.href && (
                <div className="tooltip left-full ml-3 top-1/2 -translate-y-1/2">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-3 space-y-0.5">
        {/* Help */}
        {!collapsed && (
          <div className="mx-2 mb-2 p-3 rounded-lg bg-gradient-to-br from-brand-50 to-violet-50 dark:from-brand-500/5 dark:to-violet-500/5 border border-brand-100 dark:border-brand-500/10">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">VotrIA Pro</span>
            </div>
            <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed mb-2">
              Debloquez 3 agents IA et 150 taches/jour.
            </p>
            <Link href="/dashboard/billing" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">
              Passer au Pro →
            </Link>
          </div>
        )}

        <a
          href="mailto:contact@ai2-education.com?subject=Support%20VotrIA"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-500 hover:bg-surface-50 dark:hover:bg-white/[0.04] w-full transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <HelpCircle className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Aide</span>}
        </a>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-500 hover:bg-surface-50 dark:hover:bg-white/[0.04] w-full transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <ChevronLeft
            className={`w-5 h-5 shrink-0 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          />
          {!collapsed && <span>Reduire</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white dark:bg-[#12141f] border-r border-surface-200 dark:border-white/[0.06] flex-col transition-all duration-200 z-30 hidden lg:flex ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile hamburger button (rendered in TopBar, triggered via window event) */}

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-[#12141f] flex flex-col shadow-2xl animate-slide-in-left">
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-white/5 text-surface-500 z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Mobile sidebar trigger: expose open function globally */}
      <MobileSidebarTrigger onOpen={() => setMobileOpen(true)} />
    </>
  );
}

function MobileSidebarTrigger({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    function handler() {
      onOpen();
    }
    window.addEventListener("open-mobile-sidebar", handler);
    return () => window.removeEventListener("open-mobile-sidebar", handler);
  }, [onOpen]);

  return null;
}

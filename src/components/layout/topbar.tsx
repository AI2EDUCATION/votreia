"use client";

import { Bell, Search, Menu, Moon, Sun, LogOut, Settings, User, ChevronDown, Command } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TopBarProps {
  user: {
    email: string;
    fullName?: string;
    role: string;
    avatarUrl?: string;
  };
  tenant: {
    name: string;
    plan: string;
  };
}

const planLabels: Record<string, { label: string; class: string }> = {
  trial: { label: "Essai", class: "bg-surface-100 text-surface-600 dark:bg-white/5 dark:text-surface-400" },
  essentiel: { label: "Essentiel", class: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" },
  professionnel: { label: "Pro", class: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  commande_totale: { label: "Commande Totale", class: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
};

export function TopBar({ user, tenant }: TopBarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const plan = planLabels[tenant.plan] ?? planLabels.trial;

  const initials = user.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user.email[0].toUpperCase();

  // Dark mode
  useEffect(() => {
    const saved = localStorage.getItem("votria-dark");
    if (saved === "true") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("votria-dark", String(next));
  }

  // Keyboard shortcut for command palette
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCommandOpen(false);
        setUserMenuOpen(false);
        setNotifOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <>
      <header className="h-16 border-b border-surface-200 dark:border-white/[0.06] bg-white/80 dark:bg-[#12141f]/80 backdrop-blur-lg flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
        {/* Left: Mobile menu + Tenant + Plan */}
        <div className="flex items-center gap-3">
          {/* Mobile menu */}
          <button
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-surface-50 dark:hover:bg-white/5 text-surface-500"
            onClick={() => window.dispatchEvent(new Event("open-mobile-sidebar"))}
          >
            <Menu className="w-5 h-5" />
          </button>

          <h2 className="font-semibold text-surface-900 dark:text-surface-50 truncate">
            {tenant.name}
          </h2>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${plan.class}`}>
            {plan.label}
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Command palette trigger */}
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-white/10 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-50 dark:hover:bg-white/5 transition-colors text-sm"
          >
            <Search className="w-4 h-4" />
            <span className="text-surface-400">Rechercher...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-surface-100 dark:bg-white/5 rounded text-[10px] font-mono text-surface-400">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>

          {/* Mobile search */}
          <button
            onClick={() => setCommandOpen(true)}
            className="sm:hidden p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-white/5 text-surface-500"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-white/5 text-surface-500 dark:text-surface-400 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <NotificationsDropdown
            notifRef={notifRef}
            notifOpen={notifOpen}
            onToggle={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
          />

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-50 dark:hover:bg-white/5 transition-colors"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName ?? user.email}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-surface-100 dark:ring-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-surface-100 dark:ring-white/10">
                  {initials}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-surface-900 dark:text-surface-50 leading-tight truncate max-w-[120px]">
                  {user.fullName ?? user.email}
                </div>
                <div className="text-xs text-surface-400 capitalize">{user.role}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-surface-400 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div className="dropdown-menu">
                <div className="px-3 py-2.5 mx-1.5 mb-1">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">
                    {user.fullName ?? user.email}
                  </p>
                  <p className="text-xs text-surface-400 truncate">{user.email}</p>
                </div>
                <div className="dropdown-divider" />
                <Link href="/dashboard/settings" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <User className="w-4 h-4 text-surface-400" />
                  Mon profil
                </Link>
                <Link href="/dashboard/settings" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <Settings className="w-4 h-4 text-surface-400" />
                  Parametres
                </Link>
                <Link href="/dashboard/billing" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                  <CreditCardIcon className="w-4 h-4 text-surface-400" />
                  Facturation
                </Link>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item w-full text-red-600 dark:text-red-400 hover:!bg-red-50 dark:hover:!bg-red-500/10"
                  onClick={() => router.push("/api/auth/logout")}
                >
                  <LogOut className="w-4 h-4" />
                  Deconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Command Palette */}
      {commandOpen && (
        <CommandPalette onClose={() => setCommandOpen(false)} />
      )}
    </>
  );
}

function NotificationsDropdown({
  notifRef,
  notifOpen,
  onToggle,
}: {
  notifRef: React.RefObject<HTMLDivElement | null>;
  notifOpen: boolean;
  onToggle: () => void;
}) {
  // Fetch notifications via a simple API call instead of tRPC hooks
  // (avoids hook rules issues since this component may not always be in tRPC context)
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; content: string; read: boolean }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchNotifications() {
      try {
        const res = await fetch("/api/trpc/notifications.list?batch=1&input=%7B%220%22%3A%7B%22limit%22%3A10%7D%7D");
        if (res.ok) {
          const data = await res.json();
          const items = data?.[0]?.result?.data ?? [];
          if (mounted) setNotifications(items);
        }
      } catch {
        // silently fail
      }

      try {
        const res = await fetch("/api/trpc/notifications.unreadCount?batch=1&input=%7B%220%22%3A%7B%7D%7D");
        if (res.ok) {
          const data = await res.json();
          const count = data?.[0]?.result?.data ?? 0;
          if (mounted) setUnreadCount(count);
        }
      } catch {
        // silently fail
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative" ref={notifRef}>
      <button
        onClick={onToggle}
        className="p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-white/5 text-surface-500 dark:text-surface-400 transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && <span className="notification-dot" />}
      </button>

      {notifOpen && (
        <div className="dropdown-menu w-80 right-0">
          <div className="px-4 py-3 border-b border-surface-100 dark:border-white/[0.06] flex items-center justify-between">
            <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">{unreadCount} non lues</span>
            )}
          </div>
          <div className="py-2 max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-surface-400">
                Aucune notification
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={`dropdown-item ${!notif.read ? "bg-brand-50/30 dark:bg-brand-500/5" : ""}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${notif.read ? "bg-surface-300" : "bg-brand-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-700 dark:text-surface-200 truncate">{notif.title}</p>
                    <p className="text-xs text-surface-400 truncate">{notif.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2.5 border-t border-surface-100 dark:border-white/[0.06]">
            <Link href="/dashboard/notifications" className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline">
              Voir tout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commands = [
    { label: "Tableau de bord", href: "/dashboard", icon: "📊" },
    { label: "Agents IA", href: "/dashboard/agents", icon: "🤖" },
    { label: "Taches", href: "/dashboard/tasks", icon: "📋" },
    { label: "Leads", href: "/dashboard/leads", icon: "👥" },
    { label: "Documents", href: "/dashboard/documents", icon: "📄" },
    { label: "Facturation", href: "/dashboard/billing", icon: "💳" },
    { label: "Parametres", href: "/dashboard/settings", icon: "⚙️" },
  ];

  const filtered = query
    ? commands.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  return (
    <div className="command-palette" onClick={onClose}>
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#1a1d2e] rounded-xl shadow-2xl border border-surface-200 dark:border-white/10 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-surface-100 dark:border-white/[0.06]">
          <Search className="w-5 h-5 text-surface-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une page, action..."
            className="command-input dark:text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length > 0) {
                navigate(filtered[0].href);
              }
            }}
          />
          <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-white/5 rounded text-[10px] font-mono text-surface-400 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="py-2 max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-surface-400">
              Aucun resultat pour &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-surface-400 font-medium">
                Navigation
              </div>
              {filtered.map((cmd) => (
                <button
                  key={cmd.href}
                  onClick={() => navigate(cmd.href)}
                  className="command-item w-full"
                >
                  <span className="text-base">{cmd.icon}</span>
                  <span className="text-sm">{cmd.label}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

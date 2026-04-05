"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Global keyboard shortcuts for the dashboard.
 * Renders nothing — just registers event listeners.
 *
 * Shortcuts:
 * - Ctrl+K / Cmd+K: Command palette (handled by TopBar)
 * - G then D: Go to Dashboard
 * - G then A: Go to Agents
 * - G then T: Go to Tasks
 * - G then L: Go to Leads
 * - G then S: Go to Settings
 * - G then B: Go to Billing
 * - G then N: Go to Notifications
 */
export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let gPressed = false;
    let gTimeout: ReturnType<typeof setTimeout>;

    function onKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable) {
        return;
      }

      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gPressed = true;
        clearTimeout(gTimeout);
        gTimeout = setTimeout(() => { gPressed = false; }, 1000);
        return;
      }

      if (gPressed && !e.metaKey && !e.ctrlKey) {
        gPressed = false;
        const routes: Record<string, string> = {
          d: "/dashboard",
          a: "/dashboard/agents",
          t: "/dashboard/tasks",
          l: "/dashboard/leads",
          s: "/dashboard/settings",
          b: "/dashboard/billing",
          n: "/dashboard/notifications",
          o: "/dashboard/documents",
          y: "/dashboard/analytics",
        };

        const route = routes[e.key.toLowerCase()];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
      }

      // ? key — show shortcut help
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        // Could open a help modal — for now just console
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(gTimeout);
    };
  }, [router]);

  return null;
}

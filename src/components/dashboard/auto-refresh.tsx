"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Auto-refreshes the page on an interval.
 * Place this component on pages that need periodic data updates.
 */
export function AutoRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, intervalMs);

    // Also refresh when tab becomes visible
    function onVisibility() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}

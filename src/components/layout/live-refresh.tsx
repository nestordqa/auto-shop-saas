"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

const WATCHED_TABLES = ["orders", "budgets", "diagnostics"];

/**
 * Keeps dashboard data fresh: re-renders the current route when an order the
 * user can see changes (Supabase Realtime, filtered by RLS), when the tab
 * becomes visible again and after back/forward navigation.
 */
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };

    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      supabase = null;
    }
    const channel = supabase?.channel("dashboard-live");
    if (channel) {
      for (const table of WATCHED_TABLES) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
      }
      channel.subscribe();
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("popstate", refresh);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      clearTimeout(timer);
      if (channel) supabase?.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("popstate", refresh);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [router]);

  return null;
}

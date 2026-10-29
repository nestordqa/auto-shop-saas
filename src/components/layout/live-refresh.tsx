"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

const WATCHED_TABLES = ["orders", "budgets", "diagnostics"];

/** Fired by ServiceWorkerRegister when a push notification reaches an open window. */
export const PUSH_EVENT = "torkeos:push";

/** Safety net in case Realtime or push is unavailable (blocked, not enabled, iOS without the app installed). */
const POLL_MS = 60_000;

/**
 * Keeps dashboard data fresh: re-renders the current route when a push notification
 * arrives, when an order the user can see changes (Supabase Realtime, filtered by RLS),
 * every minute while the tab is visible, when the tab becomes visible again and after
 * back/forward navigation.
 */
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
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
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | undefined;
    if (supabase) {
      const client = supabase;
      // Realtime applies RLS with the user's token; subscribing before the session loads
      // would join as anonymous and never receive the user's orders.
      void client.auth.getSession().then(async ({ data: { session } }) => {
        if (disposed || !session) return;
        await client.realtime.setAuth(session.access_token);
        channel = client.channel("dashboard-live");
        for (const table of WATCHED_TABLES) {
          channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
        }
        channel.subscribe();
      });
    }

    const poll = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("popstate", refresh);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener(PUSH_EVENT, refresh);

    return () => {
      disposed = true;
      clearTimeout(timer);
      clearInterval(poll);
      if (channel) supabase?.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("popstate", refresh);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener(PUSH_EVENT, refresh);
    };
  }, [router]);

  return null;
}

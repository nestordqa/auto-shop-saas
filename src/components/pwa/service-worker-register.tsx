"use client";

import { useEffect } from "react";

import { PUSH_EVENT } from "@/components/layout/live-refresh";

/** Registers the service worker; when a push arrives with the app open, plays the TorkeOS sound and refreshes the data. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // sw.js never caches app pages, so it is safe to register in development too (needed to test push).
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    const onMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type !== "push") return;
      void new Audio("/sounds/notification.wav").play().catch(() => {});
      // Something changed for this user: let LiveRefresh reload the current page's data.
      window.dispatchEvent(new Event(PUSH_EVENT));
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);
  return null;
}

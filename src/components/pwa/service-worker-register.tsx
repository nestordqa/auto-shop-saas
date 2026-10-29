"use client";

import { useEffect } from "react";

/** Registers the service worker and plays the TorkeOS sound when a push arrives while the app is open. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // sw.js never caches app pages, so it is safe to register in development too (needed to test push).
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    const onMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "push") void new Audio("/sounds/notification.wav").play().catch(() => {});
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);
  return null;
}

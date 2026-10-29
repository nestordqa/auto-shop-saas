"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

const noop = () => () => {};
// "installed" on the server so nothing renders until the client knows the platform.
const getPlatform = () => {
  if (window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true) return "installed";
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : "other";
};

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const platform = useSyncExternalStore(noop, getPlatform, () => "installed");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setPromptEvent(event as InstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setPromptEvent(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (installed || platform === "installed") return null;

  if (promptEvent) {
    return <button type="button" onClick={async () => { await promptEvent.prompt(); await promptEvent.userChoice; setPromptEvent(null); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100"><Download size={17} /> Instalar app en este dispositivo</button>;
  }

  if (platform === "ios") {
    return <p className="mt-4 flex items-center justify-center gap-1.5 rounded-md bg-stone-100 px-3 py-2.5 text-center text-xs leading-5 text-stone-600">Para instalar: toca <Share size={14} className="inline shrink-0" aria-label="Compartir" /> y luego «Agregar a inicio».</p>;
  }

  return null;
}

"use client";

import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { getPushState, subscribeToPush, syncPushSubscription, unsubscribeFromPush, type PushState } from "@/lib/push-client";

const hints: Partial<Record<PushState, string>> = {
  "needs-install": "En iPhone, instala la app (Compartir → Agregar a inicio) para recibir notificaciones.",
  denied: "Bloqueaste las notificaciones. Actívalas en los ajustes del navegador para este sitio.",
  unsupported: "Este navegador no admite notificaciones.",
};

export function NotificationSettings({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [state, setState] = useState<PushState | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void syncPushSubscription().then(getPushState).then((next) => { if (active) setState(next); });
    return () => { active = false; };
  }, []);

  async function toggle() {
    setPending(true);
    setError(undefined);
    try {
      if (state === "subscribed") {
        await unsubscribeFromPush();
        setState("default");
      } else {
        setState(await subscribeToPush());
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar las notificaciones.");
    }
    setPending(false);
  }

  if (!state) return null;
  const hint = hints[state];
  const muted = tone === "dark" ? "text-stone-400" : "text-stone-500";
  if (hint) return <p className={`text-xs leading-5 ${muted}`}><BellOff size={13} className="mr-1 inline" />{hint}</p>;

  const subscribed = state === "subscribed";
  return (
    <div>
      <button type="button" onClick={toggle} disabled={pending} className={`flex min-h-10 w-full items-center gap-2 rounded-md text-sm font-semibold disabled:opacity-60 ${tone === "dark" ? "text-stone-300 hover:bg-white/10 hover:px-3" : "bg-stone-100 px-4 text-stone-800"}`}>
        {pending ? <LoaderCircle size={16} className="animate-spin" /> : subscribed ? <Bell size={16} className="text-emerald-400" /> : <BellOff size={16} />}
        {subscribed ? "Notificaciones activas · Desactivar" : "Activar notificaciones"}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

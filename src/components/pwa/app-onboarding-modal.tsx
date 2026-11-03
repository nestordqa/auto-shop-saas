"use client";

import { Bell, BellRing, Download, LoaderCircle, MoreVertical, RefreshCw, Share, Smartphone, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";

import { isIos, subscribeToPush } from "@/lib/push-client";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Step = "install" | "notify" | "denied";

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
const isAndroid = () => /android/i.test(navigator.userAgent);
const isPhone = () => isIos() || isAndroid();
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Device subscription, without hanging when no service worker is registered (`ready` would never resolve). */
async function hasSubscription() {
  const registration = await navigator.serviceWorker.getRegistration();
  return Boolean(await registration?.pushManager.getSubscription());
}

/**
 * Mandatory on phones: in the browser it asks to install the app (a web page cannot tell whether the app is
 * already installed, only whether it is running as the app); inside the installed app it asks to turn on
 * notifications and stays until they are on. On computers it can be dismissed.
 */
export function AppOnboardingModal() {
  const [step, setStep] = useState<Step | null>(null);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [dismissed, setDismissed] = useState(false);

  async function evaluate() {
    if (!isStandalone()) return setStep(isPhone() ? "install" : null);
    if (!pushSupported()) return setStep(null);
    if (Notification.permission === "denied") return setStep("denied");
    if (Notification.permission === "granted" && await hasSubscription().catch(() => false)) return setStep(null);
    setStep("notify");
  }

  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setPromptEvent(event as InstallPromptEvent); if (!isStandalone()) setStep("install"); };
    const onVisible = () => { if (document.visibilityState === "visible") void evaluate(); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    document.addEventListener("visibilitychange", onVisible);
    // Deferred one tick so the first render stays empty (no setState inside the effect body).
    const timer = setTimeout(() => void evaluate(), 0);
    return () => { clearTimeout(timer); window.removeEventListener("beforeinstallprompt", onPrompt); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  if (!step || dismissed) return null;
  const blocking = isPhone();

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  async function enable() {
    setPending(true);
    setError(undefined);
    try {
      const result = await subscribeToPush();
      if (result === "subscribed") setStep(null);
      else if (result === "denied") setStep("denied");
      else setError("Debes elegir «Permitir» para continuar.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo activar las notificaciones.");
    } finally {
      setPending(false);
    }
  }

  const ios = isIos();
  const android = isAndroid();

  return (
    // Centered card that always fits the visible screen (browser bars and notch included) and scrolls inside.
    <div className="fixed inset-0 z-60 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/70 px-4 py-[max(1rem,env(safe-area-inset-top))]" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-lg bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-stone-200 p-5">
          <span className="grid size-10 place-items-center rounded-md bg-[#ef3f26] text-white">{step === "install" ? <Smartphone size={20} /> : <BellRing size={20} />}</span>
          <h2 id="onboarding-title" className="text-xl font-bold">{step === "install" ? "Instala la app de TorkeOS" : step === "notify" ? "Activa las notificaciones" : "Notificaciones bloqueadas"}</h2>
        </div>

        <div className="grid gap-4 p-5 text-sm text-stone-700">
          {step === "install" && <>
            <p>Para usar TorkeOS necesitas la app instalada: así recibes al instante los avisos de tus vehículos y órdenes.</p>
            {promptEvent ? (
              <button type="button" onClick={install} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-4 font-bold text-white active:scale-[0.98]"><Download size={18} /> Instalar app</button>
            ) : (
              <ol className="grid gap-3">
                {ios ? <>
                  <li className="flex gap-3"><Num n={1} /><span>Abre esta página en <strong>Safari</strong>.</span></li>
                  <li className="flex gap-3"><Num n={2} /><span>Toca <strong>Compartir</strong> <Share size={15} className="inline" aria-hidden /> en la barra de abajo.</span></li>
                  <li className="flex gap-3"><Num n={3} /><span>Elige <strong>Agregar a inicio</strong> <SquarePlus size={15} className="inline" aria-hidden /> y luego <strong>Agregar</strong>.</span></li>
                </> : android ? <>
                  <li className="flex gap-3"><Num n={1} /><span>Abre esta página en <strong>Chrome</strong>.</span></li>
                  <li className="flex gap-3"><Num n={2} /><span>Toca el menú <MoreVertical size={15} className="inline" aria-hidden /> arriba a la derecha.</span></li>
                  <li className="flex gap-3"><Num n={3} /><span>Elige <strong>Instalar app</strong> (o <strong>Agregar a pantalla principal</strong>).</span></li>
                </> : <>
                  <li className="flex gap-3"><Num n={1} /><span>En <strong>Chrome</strong> o <strong>Edge</strong>, toca el ícono de instalar <Download size={15} className="inline" aria-hidden /> al final de la barra de direcciones.</span></li>
                  <li className="flex gap-3"><Num n={2} /><span>Confirma con <strong>Instalar</strong>.</span></li>
                </>}
              </ol>
            )}
            <p className="rounded-md bg-amber-50 p-3 font-semibold text-amber-900">¿Ya la instalaste? Ciérrala aquí y abre TorkeOS desde el ícono en tu pantalla de inicio.</p>
          </>}

          {step === "notify" && <>
            <p>Para continuar, activa las notificaciones: así te enteras al momento de citas, ingresos, presupuestos, pagos y cuando el vehículo está listo.</p>
            <ol className="grid gap-3">
              <li className="flex gap-3"><Num n={1} /><span>Toca <strong>Activar notificaciones</strong>.</span></li>
              <li className="flex gap-3"><Num n={2} /><span>Cuando el teléfono pregunte, elige <strong>Permitir</strong>.</span></li>
            </ol>
            <button type="button" disabled={pending} onClick={enable} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-4 font-bold text-white active:scale-[0.98] disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={18} /> : <Bell size={18} />} {pending ? "Activando…" : "Activar notificaciones"}</button>
            {error && <p role="alert" className="font-semibold text-red-700">{error}</p>}
          </>}

          {step === "denied" && <>
            <p>Las notificaciones de TorkeOS están bloqueadas en este dispositivo y son necesarias para usar la app. Para activarlas:</p>
            <ol className="grid gap-3">
              {ios
                ? <li className="flex gap-3"><Num n={1} /><span>Ve a <strong>Ajustes › Notificaciones › TorkeOS</strong> y activa <strong>Permitir notificaciones</strong>.</span></li>
                : <li className="flex gap-3"><Num n={1} /><span>Mantén presionado el ícono de TorkeOS › <strong>Información de la app › Notificaciones</strong> y actívalas.</span></li>}
              <li className="flex gap-3"><Num n={2} /><span>Vuelve a la app y toca <strong>Ya las activé</strong>.</span></li>
            </ol>
            <button type="button" onClick={() => void evaluate()} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-4 font-bold text-white active:scale-[0.98]"><RefreshCw size={18} /> Ya las activé</button>
          </>}

          {!blocking && <button type="button" onClick={() => setDismissed(true)} className="min-h-11 rounded-md border border-stone-300 px-4 font-bold">Ahora no</button>}
        </div>
      </div>
    </div>
  );
}

function Num({ n }: { n: number }) {
  return <span className="grid size-6 shrink-0 place-items-center rounded-full bg-stone-900 text-xs font-bold text-white">{n}</span>;
}

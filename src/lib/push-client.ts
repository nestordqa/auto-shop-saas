/** Browser-side helpers for Web Push. */

export type PushState = "unsupported" | "needs-install" | "default" | "denied" | "subscribed";

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** Tolerates quotes, spaces and line breaks pasted into the env var; a valid key is 65 bytes (uncompressed P-256). */
function urlBase64ToUint8Array(value: string) {
  const clean = value.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "").replace(/=+$/, "");
  const padded = (clean + "=".repeat((4 - (clean.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  if (bytes.length !== 65 || bytes[0] !== 4) throw new Error("La clave pública de notificaciones (NEXT_PUBLIC_VAPID_PUBLIC_KEY) de este despliegue no es válida. Revisa que sea la clave PÚBLICA completa, sin comillas, y vuelve a desplegar.");
  return bytes;
}

async function registration() {
  return navigator.serviceWorker.ready;
}

export async function getPushState(): Promise<PushState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    // iOS only exposes Web Push inside the installed app.
    return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const subscription = await (await registration()).pushManager.getSubscription();
  return subscription && Notification.permission === "granted" ? "subscribed" : "default";
}

async function saveSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/push/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(result.error ?? "No se pudo activar las notificaciones.");
  }
}

/** Must run from a click: Safari and Firefox only allow the permission prompt after a user gesture. */
export async function subscribeToPush() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("Falta la clave pública de notificaciones en este despliegue (NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "default";
  const reg = await registration();
  const subscription = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
  await saveSubscription(subscription);
  return "subscribed" as const;
}

/** Re-links an existing device subscription to whoever is signed in now. */
export async function syncPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || Notification.permission !== "granted") return;
  const subscription = await (await registration()).pushManager.getSubscription();
  if (subscription) await saveSubscription(subscription).catch(() => undefined);
}

/** Stops this device from receiving the current user's notifications (logout or turning them off). */
export async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription) return;
  await fetch("/api/push/subscription", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) }).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}

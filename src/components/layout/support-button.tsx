import { LifeBuoy } from "lucide-react";

import { torkeosWhatsAppUrl } from "@/lib/contact";

/** Floating "Soporte" button for screens without the dashboard shell (login, sign-up, public garage page). */
export function SupportButton({ context }: { context?: string }) {
  const url = torkeosWhatsAppUrl(`Hola, necesito soporte con TorkeOS${context ? ` (${context})` : ""}.`);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="fixed bottom-4 right-4 z-40 flex min-h-12 items-center gap-2 rounded-full bg-[#25d366] px-4 font-bold text-white shadow-lg hover:bg-[#1fb857]">
      <LifeBuoy size={19} /> Soporte
    </a>
  );
}

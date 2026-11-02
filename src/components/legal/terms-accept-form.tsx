"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Checkbox + button of the acceptance screen; returns to `nextPath` once accepted. */
export function TermsAcceptForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function accept() {
    setPending(true);
    setError(undefined);
    const response = await fetch("/api/auth/accept-terms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accepted: true }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      setPending(false);
      return setError(result.error ?? "No se pudo registrar la aceptación.");
    }
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <label className="flex items-start gap-3 text-sm font-semibold"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#ef3f26]" /> He leído y acepto los términos y condiciones, y entiendo que TorkeOS es solo una prestadora de servicios tecnológicos y no se hace cargo de garantías, reparaciones ni daños ocasionados.</label>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <button type="button" disabled={!accepted || pending} onClick={accept} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-50">{pending && <LoaderCircle className="animate-spin" size={19} />} Aceptar y continuar</button>
    </div>
  );
}

"use client";

import { CheckCircle2, LoaderCircle, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { SignaturePad } from "@/components/intake/signature-pad";

/** Owner: typed name + drawn signature + acceptance, sent once. */
export function SignContractForm({ contractId, defaultName }: { contractId: string; defaultName: string }) {
  const router = useRouter();
  const [signature, setSignature] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (!signature) return setError("Dibuja tu firma en el recuadro.");
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/owner/contracts/${contractId}/sign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: values.get("name"), signature, accept: values.get("accept") === "on" }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) return setError(result.error ?? "No se pudo firmar el contrato.");
      router.refresh();
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold"><PenLine size={20} className="text-[#ef3f26]" /> Firmar contrato</h2>
      <label className="grid gap-1 text-sm font-bold">Nombre completo de quien firma<input name="name" required minLength={2} maxLength={120} defaultValue={defaultName} className="min-h-12 rounded-md border border-stone-300 px-4 font-normal" /></label>
      <div className="grid gap-1 text-sm font-bold">Tu firma<SignaturePad onChange={setSignature} /></div>
      <label className="flex items-start gap-3 text-sm"><input name="accept" type="checkbox" required className="mt-0.5 size-5 accent-[#ef3f26]" /><span>Leí el contrato completo y acepto sus condiciones en nombre del taller.</span></label>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={19} /> : <CheckCircle2 size={19} />} {pending ? "Firmando…" : "Firmar contrato"}</button>
    </form>
  );
}

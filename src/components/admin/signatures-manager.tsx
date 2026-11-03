"use client";

import { CheckCircle2, LoaderCircle, PenLine, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { SignaturePad } from "@/components/intake/signature-pad";

type Signature = { adminId: string; fullName: string; position: string; image: string };

async function put(url: string, body: object) {
  try {
    const response = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    return response.ok ? null : result.error ?? "No se pudo guardar.";
  } catch {
    return "Sin conexión. Intenta de nuevo.";
  }
}

/** Own signature editor (one per admin) + every admin's signature, any of which can be the default. */
export function SignaturesManager({ signatures, defaultAdminId, currentAdminId, currentAdminName }: { signatures: Signature[]; defaultAdminId: string | null; currentAdminId: string; currentAdminName: string }) {
  const router = useRouter();
  const own = signatures.find((signature) => signature.adminId === currentAdminId);
  const [editing, setEditing] = useState(!own);
  const [image, setImage] = useState<string | null>(null);
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const signature = image ?? own?.image;
    if (!signature) return setError("Dibuja tu firma en el recuadro.");
    setPending("save");
    setError(undefined);
    const failure = await put("/api/admin/signatures", { fullName: values.get("fullName"), position: values.get("position"), image: signature });
    setPending(undefined);
    if (failure) return setError(failure);
    setEditing(false);
    setImage(null);
    router.refresh();
  }

  async function makeDefault(adminId: string) {
    setPending(adminId);
    setError(undefined);
    const failure = await put("/api/admin/signatures/default", { adminId });
    setPending(undefined);
    if (failure) return setError(failure);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      {editing ? (
        <form onSubmit={save} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          <h2 className="flex items-center gap-2 text-lg font-bold sm:col-span-2"><PenLine size={20} className="text-[#ef3f26]" /> {own ? "Editar mi firma" : "Crear mi firma"}</h2>
          <label className="grid gap-1 text-sm font-bold">Nombre (aparece bajo la firma)<input name="fullName" required minLength={2} maxLength={120} defaultValue={own?.fullName ?? currentAdminName} className="min-h-12 rounded-md border border-stone-300 px-4 font-normal" /></label>
          <label className="grid gap-1 text-sm font-bold">Cargo en TorkeOS<input name="position" required minLength={2} maxLength={120} defaultValue={own?.position ?? ""} placeholder="Ej. Director comercial" className="min-h-12 rounded-md border border-stone-300 px-4 font-normal" /></label>
          <div className="grid gap-1 text-sm font-bold sm:col-span-2">{own ? "Nueva firma (déjala en blanco para conservar la actual)" : "Firma"}<SignaturePad onChange={setImage} /></div>
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button disabled={Boolean(pending)} className="flex min-h-12 items-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending === "save" ? <LoaderCircle className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} {pending === "save" ? "Guardando…" : "Guardar firma"}</button>
            {own && <button type="button" onClick={() => { setEditing(false); setError(undefined); }} className="min-h-12 rounded-md border border-stone-300 px-5 font-bold">Cancelar</button>}
          </div>
        </form>
      ) : (
        <div className="flex justify-end"><button type="button" onClick={() => setEditing(true)} className="flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-4 font-bold"><PenLine size={17} /> Editar mi firma</button></div>
      )}
      {!editing && error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-2">
        {signatures.map((signature) => {
          const isDefault = signature.adminId === defaultAdminId;
          return (
            <article key={signature.adminId} className={`rounded-lg border bg-white p-4 shadow-sm ${isDefault ? "border-[#ef3f26] ring-1 ring-[#ef3f26]" : "border-stone-200"}`}>
              <div className="grid h-24 place-items-center rounded-md bg-stone-50">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL signature */}
                <img src={signature.image} alt={`Firma de ${signature.fullName}`} className="max-h-20 max-w-full object-contain" />
              </div>
              <div className="mt-2 border-t border-stone-300 pt-2">
                <p className="font-bold">{signature.fullName}{signature.adminId === currentAdminId && <span className="ml-2 text-xs font-semibold text-stone-500">(tú)</span>}</p>
                <p className="text-sm text-stone-600">{signature.position} · TorkeOS</p>
              </div>
              {isDefault
                ? <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-[#d9341d]"><Star size={16} className="fill-current" /> Predeterminada en contratos nuevos</p>
                : <button type="button" disabled={Boolean(pending)} onClick={() => makeDefault(signature.adminId)} className="mt-3 flex min-h-10 items-center gap-1.5 rounded-md border border-stone-300 px-3 text-sm font-bold disabled:opacity-60">{pending === signature.adminId ? <LoaderCircle className="animate-spin" size={15} /> : <Star size={15} />} Usar como predeterminada</button>}
            </article>
          );
        })}
        {!signatures.length && <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 sm:col-span-2">Todavía no hay firmas. Crea la tuya arriba: la primera queda como predeterminada.</p>}
      </section>
    </div>
  );
}

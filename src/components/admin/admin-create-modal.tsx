"use client";

import { LoaderCircle, Plus, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PasswordInput } from "@/components/ui/password-input";

export function AdminCreateModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function createAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = event.currentTarget;
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo crear el administrador.");
    form.reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-stone-900 px-5 font-bold text-white"><Plus size={19} /> Nuevo admin</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white sm:max-w-2xl sm:rounded-lg">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-5">
              <div className="flex items-center gap-3"><ShieldCheck /><h2 id="admin-dialog-title" className="text-xl font-bold">Nuevo administrador</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button>
            </div>
            <form onSubmit={createAdmin} className="grid gap-3 p-5 sm:grid-cols-2">
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">Tendrá acceso total a la plataforma: talleres, usuarios, catálogo y facturación.</p>
              <input name="fullName" required placeholder="Nombre completo" className="min-h-12 rounded-md border border-stone-300 px-4" />
              <input name="email" type="email" required placeholder="Correo" className="min-h-12 rounded-md border border-stone-300 px-4" />
              <input name="phone" required placeholder="Teléfono" className="min-h-12 rounded-md border border-stone-300 px-4" />
              <input name="documentId" required placeholder="Cédula / documento" className="min-h-12 rounded-md border border-stone-300 px-4" />
              <PasswordInput name="temporaryPassword" required minLength={8} placeholder="Contraseña temporal" className="min-h-12 rounded-md border border-stone-300 px-4" containerClassName="sm:col-span-2" />
              {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}
              <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60 sm:col-span-2">{pending && <LoaderCircle className="animate-spin" size={19} />} Crear administrador</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

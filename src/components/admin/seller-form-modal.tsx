"use client";

import { LoaderCircle, Megaphone, Pencil, Plus, Shuffle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PasswordInput } from "@/components/ui/password-input";

const input = "min-h-12 w-full min-w-0 rounded-md border border-stone-300 px-4 font-normal";

export type SellerFormValues = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  instagram: string | null;
  compensationType: "commission" | "coupon";
  commissionPercent: number;
  couponCode: string | null;
  couponReward: number;
  isActive: boolean;
  notes: string | null;
};

function suggestCoupon(firstName: string) {
  const base = firstName.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "TORKE";
  return `${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Create a seller (with their login) or edit one when `seller` is given. */
export function SellerFormModal({ seller }: { seller?: SellerFormValues }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"commission" | "coupon">(seller?.compensationType ?? "commission");
  const [coupon, setCoupon] = useState(seller?.couponCode ?? "");
  const [firstName, setFirstName] = useState(seller?.firstName ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(seller ? `/api/admin/sellers/${seller.id}` : "/api/admin/sellers", {
      method: seller ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, compensationType: type }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo guardar el vendedor.");
    router.refresh();
    if (seller) return setOpen(false);
    setCreated({ email: String(values.email), password: String(values.temporaryPassword) });
  }

  function close() {
    setOpen(false);
    setCreated(null);
  }

  return (
    <>
      {seller
        ? <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 items-center gap-2 rounded-md border border-stone-300 px-4 text-sm font-bold"><Pencil size={16} /> Editar</button>
        : <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white"><Plus size={19} /> Nuevo vendedor</button>}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="seller-dialog-title">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white text-left sm:max-w-2xl sm:rounded-lg">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white p-5">
              <div className="flex items-center gap-3"><Megaphone /><h2 id="seller-dialog-title" className="text-xl font-bold">{created ? "Vendedor creado" : seller ? "Editar vendedor" : "Nuevo vendedor"}</h2></div>
              <button type="button" onClick={close} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button>
            </div>
            {created ? (
              <div className="grid gap-4 p-5">
                <p className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-900">Comparte estos datos de acceso con el vendedor. Podrá cambiar su contraseña desde Configuración.</p>
                <p className="rounded-md border border-stone-200 bg-stone-50 p-4 font-mono text-sm">Usuario: {created.email}<br />Contraseña: {created.password}</p>
                <button type="button" onClick={close} className="min-h-12 rounded-md border border-stone-300 px-5 font-bold">Listo</button>
              </div>
            ) : (
              <form onSubmit={save} className="grid gap-5 p-5">
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="mb-2 text-sm font-bold">Datos personales</legend>
                  <input name="firstName" required maxLength={80} value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Nombre *" className={input} />
                  <input name="lastName" required maxLength={80} defaultValue={seller?.lastName} placeholder="Apellido *" className={input} />
                  <input name="phone" type="tel" maxLength={30} defaultValue={seller?.phone ?? ""} placeholder="Teléfono / WhatsApp" className={input} />
                  <input name="instagram" maxLength={200} defaultValue={seller?.instagram ?? ""} placeholder="Instagram: @usuario" className={input} />
                </fieldset>
                {!seller && <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="mb-2 text-sm font-bold">Acceso a su panel</legend>
                  <input name="email" required type="email" maxLength={200} placeholder="Correo (su usuario) *" className={input} />
                  <PasswordInput name="temporaryPassword" required minLength={8} placeholder="Contraseña temporal *" className={input} />
                </fieldset>}
                <fieldset className="grid gap-3">
                  <legend className="mb-2 text-sm font-bold">¿Cómo gana?</legend>
                  <div className="grid grid-cols-2 rounded-md bg-stone-100 p-1">
                    <button type="button" onClick={() => setType("commission")} className={`min-h-11 rounded-sm px-3 text-sm font-bold ${type === "commission" ? "bg-white shadow-sm" : "text-stone-500"}`}>Por comisión</button>
                    <button type="button" onClick={() => { setType("coupon"); if (!coupon) setCoupon(suggestCoupon(firstName)); }} className={`min-h-11 rounded-sm px-3 text-sm font-bold ${type === "coupon" ? "bg-white shadow-sm" : "text-stone-500"}`}>Por cupón</button>
                  </div>
                  {type === "commission"
                    ? <label className="grid gap-1 text-sm font-bold">Porcentaje de comisión<input name="commissionPercent" type="number" min={0} max={100} step="0.01" required defaultValue={seller?.commissionPercent || 10} className={input} /><span className="text-xs font-normal text-stone-500">Sobre cada pago de plan confirmado de los talleres que trajo.</span></label>
                    : <label className="grid gap-1 text-sm font-bold">Monto por taller (USD)<input name="couponReward" type="number" min={0} step="0.01" required defaultValue={seller?.couponReward || 10} className={input} /><span className="text-xs font-normal text-stone-500">Se gana una vez por cada taller registrado con su cupón (o creado por él) cuando paga su primer período.</span></label>}
                  <label className="grid gap-1 text-sm font-bold">Código de cupón {type === "coupon" ? "*" : "(opcional)"}
                    <div className="flex gap-2"><input name="couponCode" required={type === "coupon"} maxLength={30} pattern="[A-Za-z0-9\-]{3,30}" value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder="Ej.: JUAN-2026" className={`${input} uppercase`} /><button type="button" onClick={() => setCoupon(suggestCoupon(firstName))} title="Generar código" aria-label="Generar código" className="grid size-12 shrink-0 place-items-center rounded-md border border-stone-300"><Shuffle size={18} /></button></div>
                    <span className="text-xs font-normal text-stone-500">Los talleres lo escriben al registrarse o lo traen en el QR. Con cupón, también un vendedor por comisión puede atribuirse talleres.</span>
                  </label>
                </fieldset>
                {seller && <label className="grid gap-1 text-sm font-bold">Estado<select name="isActive" defaultValue={seller.isActive ? "true" : "false"} className={`${input} bg-white`}><option value="true">Activo</option><option value="false">Inactivo (no puede entrar ni usar su cupón)</option></select></label>}
                <label className="grid gap-1 text-sm font-bold">Notas internas<textarea name="notes" maxLength={2000} rows={2} defaultValue={seller?.notes ?? ""} className="rounded-md border border-stone-300 px-4 py-3 font-normal" /></label>
                {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
                <button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={19} />} {seller ? "Guardar cambios" : "Crear vendedor"}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

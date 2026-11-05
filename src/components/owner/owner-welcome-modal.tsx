"use client";

import { KeyRound, LoaderCircle, PartyPopper, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BookingLinkCard } from "@/components/owner/booking-link-card";

type OwnerWelcomeModalProps = { fullName: string; email: string; garageName: string; bookingUrl: string };

/** First sign-in of an owner whose account was created by TorkeOS or a seller: their data, password and booking link. */
export function OwnerWelcomeModal({ fullName, email, garageName, bookingUrl }: OwnerWelcomeModalProps) {
  const [open, setOpen] = useState(true);
  const [closing, setClosing] = useState(false);

  async function dismiss() {
    setClosing(true);
    await fetch("/api/account/welcome", { method: "POST" }).catch(() => null);
    setOpen(false);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="owner-welcome-title">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white shadow-2xl sm:max-w-xl sm:rounded-lg">
        <header className="flex items-center gap-3 border-b border-stone-200 p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[#ef3f26] text-white"><PartyPopper size={22} /></span>
          <div><h2 id="owner-welcome-title" className="text-xl font-bold">¡Bienvenido a TorkeOS!</h2><p className="text-sm text-stone-500">{garageName} ya está activo.</p></div>
        </header>
        <div className="grid gap-5 p-5">
          <section className="grid gap-2">
            <h3 className="text-sm font-bold uppercase text-stone-500">Tus datos</h3>
            <dl className="grid gap-1 rounded-md border border-stone-200 p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-stone-500">Administrador</dt><dd className="font-semibold">{fullName}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-stone-500">Usuario (correo)</dt><dd className="break-all font-semibold">{email}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-stone-500">Taller</dt><dd className="font-semibold">{garageName}</dd></div>
            </dl>
          </section>
          <section className="flex items-start gap-3 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
            <KeyRound size={20} className="mt-0.5 shrink-0" />
            <p>Entraste con una <strong>contraseña temporal</strong>. Te recomendamos cambiarla en <Link href="/dashboard/owner/settings#password" onClick={dismiss} className="font-bold underline">Configuración › Contraseña</Link>.</p>
          </section>
          <section className="grid gap-2">
            <h3 className="text-sm font-bold uppercase text-stone-500">Tu enlace de reservas</h3>
            <p className="text-sm text-stone-600">Compártelo con tus clientes: con él crean su cuenta y agendan citas directo en tu taller.</p>
            <BookingLinkCard url={bookingUrl} garageName={garageName} />
            <p className="flex items-center gap-1 text-xs text-stone-500"><Settings size={13} className="shrink-0" /> Siempre lo encuentras en Configuración › Enlace de reservas.</p>
          </section>
          <button type="button" onClick={dismiss} disabled={closing} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{closing && <LoaderCircle className="animate-spin" size={18} />} Entendido</button>
        </div>
      </div>
    </div>
  );
}

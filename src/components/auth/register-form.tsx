"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PasswordInput } from "@/components/ui/password-input";

export function RegisterForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, nextPath }) });
    const result = await response.json() as { error?: string; redirectTo?: string };
    setPending(false);
    if (!response.ok || !result.redirectTo) return setError(result.error ?? "No se pudo crear la cuenta.");
    router.replace(result.redirectTo);
    router.refresh();
  }

  return <form onSubmit={submit} className="mt-7 grid gap-4"><input name="fullName" required minLength={2} placeholder="Nombre completo" autoComplete="name" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="email" required type="email" placeholder="Correo electrónico" autoComplete="email" className="min-h-12 rounded-md border border-stone-300 px-4" /><div className="grid gap-4 sm:grid-cols-2"><input name="phone" required type="tel" placeholder="Teléfono" autoComplete="tel" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="documentId" required placeholder="Cédula / documento" className="min-h-12 rounded-md border border-stone-300 px-4" /></div><PasswordInput name="password" required minLength={8} placeholder="Contraseña (mínimo 8 caracteres)" autoComplete="new-password" className="min-h-12 rounded-md border border-stone-300 px-4" />{error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}<button disabled={pending} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending ? <LoaderCircle className="animate-spin" size={20} /> : <>Crear cuenta <ArrowRight size={20} /></>}</button><p className="text-center text-sm text-stone-600">¿Ya tienes cuenta? <Link href={`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`} className="font-bold text-[#d9341d] hover:underline">Inicia sesión</Link></p></form>;
}
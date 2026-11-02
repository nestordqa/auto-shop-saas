"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const forgotSchema = z.object({ email: z.email("Ingresa un correo válido.") });

type ForgotInput = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm({ expired }: { expired?: boolean }) {
  const [serverError, setServerError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotInput>({ resolver: zodResolver(forgotSchema) });

  async function requestReset(values: ForgotInput) {
    setServerError(undefined);
    const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      setServerError(result.error ?? "No pudimos enviar el correo.");
      return;
    }
    setSentTo(values.email);
  }

  if (sentTo) return <div className="mt-7 grid gap-4"><div className="flex gap-3 rounded-md bg-emerald-50 p-4 text-sm text-emerald-900"><MailCheck className="shrink-0" size={20} /><p>Si existe una cuenta con <strong>{sentTo}</strong>, recibirás un correo con un enlace para crear una nueva contraseña. Revisa también la carpeta de spam.</p></div><Link href="/login" className="text-center text-sm font-bold text-[#d9341d] hover:underline">Volver a iniciar sesión</Link></div>;

  return (
    <form onSubmit={handleSubmit(requestReset)} className="mt-7 grid gap-4">
      {expired && <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-900">El enlace de recuperación no es válido o expiró. Solicita uno nuevo.</p>}
      <div><label htmlFor="email" className="text-sm font-bold">Correo electrónico</label><input suppressHydrationWarning id="email" type="email" autoComplete="email" className="mt-2 min-h-12 w-full rounded-md border border-stone-300 px-4 text-base outline-none focus:border-[#ef3f26] focus:ring-2 focus:ring-[#ef3f26]/20" {...register("email")} />{errors.email && <p className="mt-1 text-sm text-red-700">{errors.email.message}</p>}</div>
      {serverError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{serverError}</p>}
      <button suppressHydrationWarning disabled={isSubmitting} className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white hover:bg-[#d9341d] disabled:opacity-60">{isSubmitting ? <LoaderCircle className="animate-spin" size={20} /> : "Enviar enlace"}</button>
      <Link href="/login" className="text-center text-sm font-bold text-[#d9341d] hover:underline">Volver a iniciar sesión</Link>
    </form>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PasswordInput } from "@/components/ui/password-input";

const loginSchema = z.object({
  email: z.email("Ingresa un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function signIn(values: LoginInput) {
    setServerError(undefined);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, nextPath }),
    });
    const result = await response.json() as { error?: string; redirectTo?: string };

    if (!response.ok || !result.redirectTo) {
      setServerError(result.error ?? "No pudimos iniciar sesión.");
      return;
    }

    router.replace(result.redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(signIn)} className="mt-7 grid gap-4">
      <div><label htmlFor="email" className="text-sm font-bold">Correo electrónico</label><input id="email" type="email" autoComplete="email" className="mt-2 min-h-12 w-full rounded-md border border-stone-300 px-4 text-base outline-none focus:border-[#ef3f26] focus:ring-2 focus:ring-[#ef3f26]/20" {...register("email")} />{errors.email && <p className="mt-1 text-sm text-red-700">{errors.email.message}</p>}</div>
      <div><label htmlFor="password" className="text-sm font-bold">Contraseña</label><PasswordInput id="password" autoComplete="current-password" className="mt-2 min-h-12 rounded-md border border-stone-300 px-4 text-base outline-none focus:border-[#ef3f26] focus:ring-2 focus:ring-[#ef3f26]/20" {...register("password")} />{errors.password && <p className="mt-1 text-sm text-red-700">{errors.password.message}</p>}</div>
      {serverError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{serverError}</p>}
      <button disabled={isSubmitting} className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white hover:bg-[#d9341d] disabled:opacity-60">{isSubmitting ? <LoaderCircle className="animate-spin" size={20} /> : <>Entrar <ArrowRight size={20} /></>}</button>
      <p className="text-center text-sm text-stone-600">¿Aún no tienes acceso? <Link href={`/register${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`} className="font-bold text-[#d9341d] hover:underline">Crea tu cuenta</Link></p>
    </form>
  );
}
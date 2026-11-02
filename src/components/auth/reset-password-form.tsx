"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PasswordInput } from "@/components/ui/password-input";

const resetSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72, "Máximo 72 caracteres."),
  confirm: z.string(),
}).refine((values) => values.password === values.confirm, { message: "Las contraseñas no coinciden.", path: ["confirm"] });

type ResetInput = z.infer<typeof resetSchema>;

const inputClass = "mt-2 min-h-12 rounded-md border border-stone-300 px-4 text-base outline-none focus:border-[#ef3f26] focus:ring-2 focus:ring-[#ef3f26]/20";

export function ResetPasswordForm() {
  const [serverError, setServerError] = useState<string>();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetInput>({ resolver: zodResolver(resetSchema) });

  async function savePassword(values: ResetInput) {
    setServerError(undefined);
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: values.password }) });
    const result = await response.json().catch(() => ({})) as { error?: string; redirectTo?: string };
    if (!response.ok || !result.redirectTo) {
      setServerError(result.error ?? "No se pudo actualizar la contraseña.");
      return;
    }
    window.location.assign(result.redirectTo);
    await new Promise(() => {});
  }

  return (
    <form onSubmit={handleSubmit(savePassword)} className="mt-7 grid gap-4">
      <div><label htmlFor="password" className="text-sm font-bold">Nueva contraseña</label><PasswordInput id="password" autoComplete="new-password" className={inputClass} {...register("password")} />{errors.password && <p className="mt-1 text-sm text-red-700">{errors.password.message}</p>}</div>
      <div><label htmlFor="confirm" className="text-sm font-bold">Confirmar contraseña</label><PasswordInput id="confirm" autoComplete="new-password" className={inputClass} {...register("confirm")} />{errors.confirm && <p className="mt-1 text-sm text-red-700">{errors.confirm.message}</p>}</div>
      {serverError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">{serverError}</p>}
      <button suppressHydrationWarning disabled={isSubmitting} className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white hover:bg-[#d9341d] disabled:opacity-60">{isSubmitting ? <LoaderCircle className="animate-spin" size={20} /> : "Guardar contraseña"}</button>
    </form>
  );
}

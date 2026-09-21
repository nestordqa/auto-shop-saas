"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & { containerClassName?: string };

export function PasswordInput({ className = "", containerClassName = "", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return <div className={`relative ${containerClassName}`}><input {...props} type={visible ? "text" : "password"} className={`${className} w-full pr-12`} /><button type="button" onClick={() => setVisible((current) => !current)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-stone-500 hover:text-stone-900" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>;
}
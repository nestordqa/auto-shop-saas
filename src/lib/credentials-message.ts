import { MESSAGE_TEMPLATES, renderTemplate } from "@/lib/message-templates";

/** Login block for WhatsApp welcome messages: email, temporary password and how to replace it. */
export function credentialsText({ origin, email, password }: { origin: string; email: string; password: string }, template = MESSAGE_TEMPLATES.credentials.body) {
  return renderTemplate(template, { panel: `${origin}/login`, correo: email, clave: password, recuperar: `${origin}/forgot-password` });
}

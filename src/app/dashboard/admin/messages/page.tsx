import { MessageTemplatesEditor } from "@/components/admin/message-templates-editor";
import { getMessageTemplates } from "@/lib/message-templates-data";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminMessagesPage() {
  const templates = await getMessageTemplates(createAdminClient());
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
      <p className="text-xs font-bold uppercase text-[#d9341d]">Administración</p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Mensajes de WhatsApp</h1>
      <p className="mt-1 text-sm text-stone-600">Edita el texto de cada mensaje que prepara TorkeOS. Los cambios aplican de inmediato para todos; en la página principal pueden tardar hasta 5 minutos.</p>
      <div className="mt-6"><MessageTemplatesEditor templates={templates} /></div>
    </div>
  );
}

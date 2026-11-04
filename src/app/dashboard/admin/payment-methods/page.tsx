import { PaymentMethodsEditor } from "@/components/owner/payment-methods-editor";
import { requireRole } from "@/lib/auth/require-role";
import { getPaymentMethods } from "@/lib/payments-data";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminPaymentMethodsPage() {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const methods = admin ? await getPaymentMethods(admin, null) : [];

  return <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header className="mb-6"><p className="text-xs font-bold uppercase text-[#d9341d]">Administración</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Medios de pago de TorkeOS</h1><p className="mt-1 text-sm text-stone-600">Los administradores ven estos datos al pagar su plan desde «Facturación». Cuando reportan un pago te llega una notificación para revisarlo en el contrato.</p></header>
    <PaymentMethodsEditor methods={methods} endpoint="/api/admin/payment-methods" />
  </div>;
}

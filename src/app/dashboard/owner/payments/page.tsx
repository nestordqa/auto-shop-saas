import { PaymentMethodsEditor } from "@/components/owner/payment-methods-editor";
import { requireOwnerGarage } from "@/lib/auth/require-owner-garage";
import { getPaymentMethods } from "@/lib/payments-data";

export default async function OwnerPaymentsPage() {
  const { user, garage, dataClient } = await requireOwnerGarage({ ownerOnly: true });
  if (!garage) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Taller no asignado</h1><p className="mt-2 text-stone-600">La cuenta {user.email} no coincide con el administrador configurado para un taller.</p></div>;
  const methods = await getPaymentMethods(dataClient, garage.id);

  return <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <header className="mb-6"><p className="text-xs font-bold uppercase text-[#d9341d]">{garage.name}</p><h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Métodos de pago</h1><p className="mt-1 text-sm text-stone-600">Activa los que aceptas. Tus clientes los verán cuando aprueben el presupuesto y el vehículo pase a reparación; también podrán elegir pagar en el taller. Si un método tiene descuento, el cliente verá el monto ya rebajado.</p></header>
    <PaymentMethodsEditor methods={methods} />
  </div>;
}

"use client";

import { ClipboardPlus, LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PasswordInput } from "@/components/ui/password-input";

type ClientOption = { id: string; name: string; documentId: string | null };
type VehicleOption = { id: string; clientId: string; label: string };
type BrandOption = { id: string; name: string };
type ModelOption = { id: string; brandId: string; name: string };
type MechanicOption = { id: string; name: string; specialty: string };
const availableYears = Array.from({ length: new Date().getFullYear() - 1899 }, (_, index) => new Date().getFullYear() - index);
const appointmentTimes = Array.from({ length: 21 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

export function OrderCreateFlowModal({ clients, vehicles, brands, models, mechanics }: { clients: ClientOption[]; vehicles: VehicleOption[]; brands: BrandOption[]; models: ModelOption[]; mechanics: MechanicOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientSelection, setClientSelection] = useState(clients[0]?.id ?? "__new__");
  const initialVehicles = vehicles.filter((vehicle) => vehicle.clientId === clients[0]?.id);
  const [vehicleSelection, setVehicleSelection] = useState(initialVehicles[0]?.id ?? "__new__");
  const [brandSelection, setBrandSelection] = useState(brands[0]?.id ?? "");
  const initialModels = models.filter((model) => model.brandId === brands[0]?.id);
  const [modelSelection, setModelSelection] = useState(initialModels[0]?.id ?? "__new__");
  const [yearSelection, setYearSelection] = useState(new Date().getFullYear());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const clientVehicles = vehicles.filter((vehicle) => vehicle.clientId === clientSelection);
  const creatingClient = clientSelection === "__new__";
  const creatingVehicle = creatingClient || vehicleSelection === "__new__";
  const availableModels = models.filter((model) => model.brandId === brandSelection);
  const creatingModel = modelSelection === "__new__";

  function selectClient(clientId: string) {
    setClientSelection(clientId);
    setVehicleSelection(vehicles.find((vehicle) => vehicle.clientId === clientId)?.id ?? "__new__");
  }

  function selectBrand(brandId: string) {
    const firstModel = models.find((model) => model.brandId === brandId);
    setBrandSelection(brandId);
    setModelSelection(firstModel?.id ?? "__new__");
  }

  function selectModel(modelId: string) {
    setModelSelection(modelId);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const appointment = new Date(`${String(values.appointmentDate)}T${String(values.appointmentTime)}:00`);
    const client = creatingClient
      ? { mode: "new", fullName: values.clientName, email: values.clientEmail, phone: values.clientPhone, documentId: values.clientDocument, temporaryPassword: values.clientPassword }
      : { mode: "existing", id: clientSelection };
    const vehicle = creatingVehicle
      ? { mode: "new", brandId: brandSelection, model: creatingModel ? { mode: "new", name: values.newModelName, year: yearSelection } : { mode: "existing", id: modelSelection, year: yearSelection }, color: values.color, plate: values.plate }
      : { mode: "existing", id: vehicleSelection };
    const response = await fetch("/api/owner/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client, vehicle, mechanicId: values.mechanicId || null, appointmentDate: values.appointmentDate, appointmentTime: values.appointmentTime, timezoneOffset: appointment.getTimezoneOffset() }) });
    const result = await response.json() as { error?: string; orderId?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo crear la orden.");
    form.reset();
    setOpen(false);
    router.push(`/dashboard/owner/orders/${result.orderId}`);
    router.refresh();
  }

  return <><button type="button" onClick={() => setOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white"><Plus size={19} /> Crear orden</button>{open && <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true"><div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white sm:max-w-2xl sm:rounded-lg"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white p-5"><div className="flex items-center gap-3"><ClipboardPlus /><h2 className="text-xl font-bold">Nueva orden</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button></div><form onSubmit={submit} className="grid gap-5 p-5">
    <fieldset className="grid gap-3"><legend className="mb-2 font-bold">1. Cliente</legend><select value={clientSelection} onChange={(event) => selectClient(event.target.value)} className="min-h-12 rounded-md border border-stone-300 bg-white px-4">{clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.documentId ? ` · ${client.documentId}` : ""}</option>)}<option value="__new__">+ Crear nuevo cliente</option></select>{creatingClient && <div className="grid gap-3 sm:grid-cols-2"><input name="clientName" required placeholder="Nombre completo" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="clientEmail" required type="email" placeholder="Correo" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="clientPhone" required placeholder="Teléfono" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="clientDocument" required placeholder="Documento" className="min-h-12 rounded-md border border-stone-300 px-4" /><PasswordInput name="clientPassword" required minLength={8} placeholder="Contraseña temporal" className="min-h-12 rounded-md border border-stone-300 px-4" containerClassName="sm:col-span-2" /></div>}</fieldset>
    <fieldset className="grid gap-3"><legend className="mb-2 font-bold">2. Vehículo</legend>{!creatingClient && <select value={vehicleSelection} onChange={(event) => setVehicleSelection(event.target.value)} className="min-h-12 rounded-md border border-stone-300 bg-white px-4">{clientVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>)}<option value="__new__">+ Crear nuevo vehículo</option></select>}{creatingVehicle && <div className="grid gap-3 sm:grid-cols-2"><select value={brandSelection} onChange={(event) => selectBrand(event.target.value)} required className="min-h-12 rounded-md border border-stone-300 bg-white px-4 sm:col-span-2"><option value="">Selecciona marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select><select value={modelSelection} onChange={(event) => selectModel(event.target.value)} required className="min-h-12 rounded-md border border-stone-300 bg-white px-4 sm:col-span-2">{availableModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}<option value="__new__">+ Agregar nuevo modelo</option></select>{creatingModel && <input name="newModelName" required placeholder="Nombre del nuevo modelo" className="min-h-12 rounded-md border border-stone-300 px-4 sm:col-span-2" />}<select value={yearSelection} onChange={(event) => setYearSelection(Number(event.target.value))} required className="min-h-12 rounded-md border border-stone-300 bg-white px-4 sm:col-span-2">{availableYears.map((year) => <option key={year} value={year}>{year}</option>)}</select><input name="color" required placeholder="Color" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="plate" required placeholder="Placa" className="min-h-12 rounded-md border border-stone-300 px-4 uppercase" /></div>}</fieldset>
    <fieldset className="grid gap-3"><legend className="mb-2 font-bold">3. Cita y asignación</legend><div className="grid gap-3 sm:grid-cols-2"><input name="appointmentDate" type="date" required min={new Date().toISOString().slice(0, 10)} className="min-h-12 rounded-md border border-stone-300 px-4" /><select name="appointmentTime" required defaultValue="08:00" className="min-h-12 rounded-md border border-stone-300 bg-white px-4">{appointmentTimes.map((time) => <option key={time} value={time}>{new Intl.DateTimeFormat("es", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(`2000-01-01T${time}:00`))}</option>)}</select></div><select name="mechanicId" defaultValue="" className="min-h-12 rounded-md border border-stone-300 bg-white px-4"><option value="">Sin mecánico asignado</option>{mechanics.map((mechanic) => <option key={mechanic.id} value={mechanic.id}>{mechanic.name} · {mechanic.specialty}</option>)}</select></fieldset>
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}<button disabled={pending || (creatingVehicle && !brandSelection)} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={19} />} Crear orden</button>
  </form></div></div>}</>;
}
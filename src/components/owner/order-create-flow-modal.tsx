"use client";

import { CheckCircle2, ClipboardPlus, LoaderCircle, MessageCircle, Plus, RefreshCw, Search, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useMessageTemplate } from "@/components/messages/use-message-template";
import { credentialsText } from "@/lib/credentials-message";
import { renderTemplate } from "@/lib/message-templates";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp";
import { formatSlotTime, parseSchedule, scheduleSlots } from "@/lib/schedule";

type ClientOption = { id: string; name: string; documentId: string | null; phone?: string | null };
type NewClient = { name: string; email: string; phone: string; password: string; withAccess: boolean };

const inputClass = "min-h-12 w-full rounded-md border border-stone-300 px-4 font-normal";
const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Easy to dictate: no look-alike characters (0/O, 1/l/I). */
function generatePassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

/** Search by name, document or phone instead of scrolling a long select. */
function ClientPicker({ clients, value, onChange }: { clients: ClientOption[]; value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const selected = clients.find((client) => client.id === value);
  const term = normalizeSearch(query.trim());
  const digits = query.replace(/\D/g, "");
  const matches = term
    ? clients.filter((client) => normalizeSearch(`${client.name} ${client.documentId ?? ""}`).includes(term) || (digits.length >= 3 && (client.phone ?? "").replace(/\D/g, "").includes(digits))).slice(0, 8)
    : [];

  if (selected) return <div className="flex items-center justify-between gap-3 rounded-md border border-stone-900 bg-stone-50 p-3"><div className="min-w-0"><p className="truncate font-bold">{selected.name}</p><p className="truncate text-xs text-stone-500">{[selected.documentId, selected.phone].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p></div><button type="button" onClick={() => { onChange(""); setQuery(""); }} className="shrink-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-bold">Cambiar</button></div>;

  return <div className="grid gap-2">
    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, documento o teléfono" aria-label="Buscar cliente" className={`${inputClass} pl-10`} /></div>
    {term && <ul className="max-h-64 divide-y divide-stone-100 overflow-y-auto rounded-md border border-stone-200">{matches.map((client) => <li key={client.id}><button type="button" onClick={() => onChange(client.id)} className="w-full px-4 py-3 text-left hover:bg-stone-50"><p className="font-semibold">{client.name}</p><p className="text-xs text-stone-500">{[client.documentId, client.phone].filter(Boolean).join(" · ")}</p></button></li>)}{!matches.length && <li className="px-4 py-3 text-sm text-stone-500">No encontramos clientes con «{query.trim()}».</li>}</ul>}
    <button type="button" onClick={() => onChange("__new__")} className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-dashed border-stone-400 px-4 text-sm font-bold text-stone-700 hover:bg-stone-50"><UserPlus size={17} /> Crear nuevo cliente</button>
  </div>;
}

/** After creating an order for a new client: send them their login and the garage link by WhatsApp. */
function NewClientShare({ client, garage, orderId, onDone }: { client: NewClient; garage: { name: string; slug: string }; orderId: string; onDone: (orderId: string) => void }) {
  const template = useMessageTemplate("client_welcome");
  const credentialsTemplate = useMessageTemplate("credentials");
  const origin = window.location.origin;
  const message = renderTemplate(template, { nombre: client.name.split(" ")[0], taller: garage.name, enlace: `${origin}/${garage.slug}`, acceso: credentialsText({ origin, email: client.email, password: client.password }, credentialsTemplate) });
  const phone = normalizeWhatsAppPhone(client.phone);
  if (!client.withAccess) return <div className="grid gap-4 p-5">
    <p className="flex items-center gap-2 font-bold text-emerald-700"><CheckCircle2 size={20} /> Orden creada</p>
    <p className="text-sm text-stone-600">{client.name} quedó registrado sin acceso a la app. En la orden tendrás el botón para avisarle por WhatsApp al ingresar el vehículo, con el presupuesto y cuando esté listo para entregar. Si más adelante quiere usar la app, dale acceso desde la orden.</p>
    <button type="button" onClick={() => onDone(orderId)} className="min-h-12 rounded-md bg-stone-900 px-5 font-bold text-white">Ir a la orden</button>
  </div>;
  return <div className="grid gap-4 p-5">
    <p className="flex items-center gap-2 font-bold text-emerald-700"><CheckCircle2 size={20} /> Orden creada y cliente registrado</p>
    <p className="text-sm text-stone-600">Envíale a {client.name} sus datos de acceso y el enlace del taller para que siga su orden y agende sus próximas citas.</p>
    <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-stone-200 bg-stone-50 p-4 font-sans text-sm text-stone-700">{message}</pre>
    <a href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#25d366] px-5 font-bold text-white"><MessageCircle size={18} /> Enviar acceso por WhatsApp</a>
    <button type="button" onClick={() => onDone(orderId)} className="min-h-12 rounded-md border border-stone-300 px-5 font-bold">Ir a la orden</button>
  </div>;
}
/** `openOrderLabel` is set when the vehicle already has an order that is not delivered. */
type VehicleOption = { id: string; clientId: string; label: string; openOrderLabel?: string | null };
type BrandOption = { id: string; name: string };
type ModelOption = { id: string; brandId: string; name: string };
type MechanicOption = { id: string; name: string; specialty: string; branchId: string };
type BranchOption = { id: string; name: string; schedule: unknown };
const availableYears = Array.from({ length: new Date().getFullYear() - 1899 }, (_, index) => new Date().getFullYear() - index);

/** `branches` lists the active branches the user can book into; with more than one a branch picker is shown. */
/** `orderBasePath` is where the new order opens ("/dashboard/mechanic/orders" for reception mechanics). */
export function OrderCreateFlowModal({ clients, vehicles, brands, models, mechanics, branches, garage, orderBasePath = "/dashboard/owner/orders" }: { garage: { name: string; slug: string }; clients: ClientOption[]; vehicles: VehicleOption[]; brands: BrandOption[]; models: ModelOption[]; mechanics: MechanicOption[]; branches: BranchOption[]; orderBasePath?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientSelection, setClientSelection] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const [created, setCreated] = useState<{ orderId: string; client: NewClient }>();
  const [withAccess, setWithAccess] = useState(false);
  const firstAvailableVehicle = (clientId: string | undefined) =>
    vehicles.find((vehicle) => vehicle.clientId === clientId && !vehicle.openOrderLabel)?.id ?? "__new__";
  const [vehicleSelection, setVehicleSelection] = useState("__new__");
  const [brandSelection, setBrandSelection] = useState(brands[0]?.id ?? "");
  const initialModels = models.filter((model) => model.brandId === brands[0]?.id);
  const [modelSelection, setModelSelection] = useState(initialModels[0]?.id ?? "__new__");
  const [yearSelection, setYearSelection] = useState(new Date().getFullYear());
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const branchMechanics = mechanics.filter((mechanic) => mechanic.branchId === branchId);
  const [appointmentDate, setAppointmentDate] = useState("");
  const branchSchedule = parseSchedule(branches.find((branch) => branch.id === branchId)?.schedule);
  const times = appointmentDate ? scheduleSlots(branchSchedule, appointmentDate) : [];
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const clientVehicles = vehicles.filter((vehicle) => vehicle.clientId === clientSelection);
  const creatingClient = clientSelection === "__new__";
  const creatingVehicle = creatingClient || vehicleSelection === "__new__";
  const hasClient = Boolean(clientSelection);
  const availableModels = models.filter((model) => model.brandId === brandSelection);
  const creatingModel = modelSelection === "__new__";

  function selectClient(clientId: string) {
    setClientSelection(clientId);
    setVehicleSelection(firstAvailableVehicle(clientId));
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
    if (!clientSelection) { setPending(false); return setError("Busca y elige un cliente, o crea uno nuevo."); }
    const appointment = new Date(`${String(values.appointmentDate)}T${String(values.appointmentTime)}:00`);
    const timezoneOffset = Number.isNaN(appointment.getTime()) ? new Date().getTimezoneOffset() : appointment.getTimezoneOffset();
    const client = creatingClient
      ? { mode: "new", fullName: values.clientName, email: withAccess ? values.clientEmail : "", phone: values.clientPhone, documentId: values.clientDocument ?? "", temporaryPassword: withAccess ? password : "" }
      : { mode: "existing", id: clientSelection };
    const vehicle = creatingVehicle
      ? { mode: "new", brandId: brandSelection, model: creatingModel ? { mode: "new", name: values.newModelName, year: yearSelection } : { mode: "existing", id: modelSelection, year: yearSelection }, color: values.color, plate: values.plate }
      : { mode: "existing", id: vehicleSelection };
    const response = await fetch("/api/owner/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client, vehicle, mechanicId: values.mechanicId || null, branchId: branchId || null, appointmentDate: values.appointmentDate, appointmentTime: values.appointmentTime, timezoneOffset }) });
    const result = await response.json() as { error?: string; orderId?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo crear la orden.");
    form.reset();
    if (creatingClient && result.orderId) return setCreated({ orderId: result.orderId, client: { name: String(values.clientName).trim(), email: String(values.clientEmail ?? "").trim(), phone: String(values.clientPhone), password, withAccess } });
    goToOrder(result.orderId!);
  }

  function goToOrder(orderId: string) {
    setOpen(false);
    setCreated(undefined);
    setClientSelection("");
    setPassword(generatePassword());
    router.push(`${orderBasePath}/${orderId}`);
    router.refresh();
  }

  return <><button type="button" onClick={() => setOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white"><Plus size={19} /> Crear orden</button>{open && <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true"><div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-lg bg-white sm:max-w-2xl sm:rounded-lg"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white p-5"><div className="flex items-center gap-3"><ClipboardPlus /><h2 className="text-xl font-bold">Nueva orden</h2></div><button type="button" onClick={() => created ? goToOrder(created.orderId) : setOpen(false)} aria-label="Cerrar" className="grid size-11 place-items-center"><X /></button></div>{created ? <NewClientShare client={created.client} garage={garage} orderId={created.orderId} onDone={goToOrder} /> : <form onSubmit={submit} className="grid gap-5 p-5">
    <fieldset className="grid gap-3"><legend className="mb-2 font-bold">1. Cliente</legend>{creatingClient ? <>
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-stone-600">Nuevo cliente</p><button type="button" onClick={() => selectClient("")} className="text-sm font-bold text-[#d9341d]">Buscar cliente existente</button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold sm:col-span-2">Nombre completo<input name="clientName" required minLength={2} maxLength={120} autoComplete="off" placeholder="Ej. María Pérez" className={inputClass} /></label>
        <label className="grid gap-1 text-sm font-bold">Teléfono (WhatsApp)<input name="clientPhone" required type="tel" inputMode="tel" minLength={7} maxLength={30} autoComplete="off" placeholder="0412 123 4567" className={inputClass} /></label>
        <label className="grid gap-1 text-sm font-bold">Cédula o RIF <span className="font-normal text-stone-500">(opcional)</span><input name="clientDocument" minLength={4} maxLength={30} autoComplete="off" placeholder="V-12345678" className={inputClass} /></label>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-stone-300 p-3 text-sm sm:col-span-2"><input type="checkbox" checked={withAccess} onChange={(event) => setWithAccess(event.target.checked)} className="mt-1 size-4 accent-[#ef3f26]" /><span><span className="block font-bold">Crear acceso a la app</span><span className="text-stone-600">Solo si el cliente tiene correo y quiere usar la app. Si no, le avisarás de cada etapa por WhatsApp y podrás darle acceso más adelante sin perder su vehículo.</span></span></label>
        {withAccess && <label className="grid gap-1 text-sm font-bold">Correo<input name="clientEmail" required type="email" maxLength={160} autoComplete="off" autoCapitalize="none" placeholder="cliente@correo.com" className={inputClass} /></label>}
        {withAccess && <label className="grid gap-1 text-sm font-bold">Contraseña temporal<div className="flex gap-2"><input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" className={`${inputClass} font-mono`} /><button type="button" onClick={() => setPassword(generatePassword())} title="Generar otra" aria-label="Generar otra contraseña" className="grid size-12 shrink-0 place-items-center rounded-md border border-stone-300"><RefreshCw size={17} /></button></div></label>}
      </div>
      {withAccess && <p className="text-xs text-stone-500">Al crear la orden podrás enviarle estos datos por WhatsApp junto al enlace del taller.</p>}
    </> : <ClientPicker clients={clients} value={clientSelection} onChange={selectClient} />}</fieldset>
    <fieldset className="grid gap-3"><legend className="mb-2 font-bold">2. Vehículo</legend>{!hasClient && <p className="text-sm text-stone-500">Elige primero el cliente.</p>}{hasClient && !creatingClient && <select value={vehicleSelection} onChange={(event) => setVehicleSelection(event.target.value)} className="min-h-12 rounded-md border border-stone-300 bg-white px-4">{clientVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id} disabled={Boolean(vehicle.openOrderLabel)}>{vehicle.label}{vehicle.openOrderLabel ? ` · Orden abierta: ${vehicle.openOrderLabel}` : ""}</option>)}<option value="__new__">+ Crear nuevo vehículo</option></select>}{!creatingClient && clientVehicles.some((vehicle) => vehicle.openOrderLabel) && <p className="text-xs text-stone-500">Los vehículos con una orden abierta no pueden recibir otra hasta que se entreguen.</p>}{hasClient && creatingVehicle && <div className="grid gap-3 sm:grid-cols-2"><select value={brandSelection} onChange={(event) => selectBrand(event.target.value)} required className="min-h-12 rounded-md border border-stone-300 bg-white px-4 sm:col-span-2"><option value="">Selecciona marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select><select value={modelSelection} onChange={(event) => selectModel(event.target.value)} required className="min-h-12 rounded-md border border-stone-300 bg-white px-4 sm:col-span-2">{availableModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}<option value="__new__">+ Agregar nuevo modelo</option></select>{creatingModel && <input name="newModelName" required placeholder="Nombre del nuevo modelo" className="min-h-12 rounded-md border border-stone-300 px-4 sm:col-span-2" />}<select value={yearSelection} onChange={(event) => setYearSelection(Number(event.target.value))} required className="min-h-12 rounded-md border border-stone-300 bg-white px-4 sm:col-span-2">{availableYears.map((year) => <option key={year} value={year}>{year}</option>)}</select><input name="color" required minLength={2} maxLength={50} placeholder="Color" className="min-h-12 rounded-md border border-stone-300 px-4" /><input name="plate" required minLength={3} maxLength={20} placeholder="Placa" className="min-h-12 rounded-md border border-stone-300 px-4 uppercase" /></div>}</fieldset>
    <fieldset className="grid gap-3"><legend className="mb-2 font-bold">3. Cita y asignación</legend>{branches.length > 1 && <label className="grid gap-1 text-sm font-bold">Sucursal<select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="min-h-12 rounded-md border border-stone-300 bg-white px-4 font-normal">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}<div className="grid gap-3 sm:grid-cols-2"><input name="appointmentDate" type="date" required value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} min={new Date().toISOString().slice(0, 10)} className="min-h-12 rounded-md border border-stone-300 px-4" /><select key={`${branchId}-${appointmentDate}`} name="appointmentTime" required disabled={!times.length} className="min-h-12 rounded-md border border-stone-300 bg-white px-4 disabled:bg-stone-100">{!appointmentDate ? <option value="">Elige la fecha</option> : !times.length ? <option value="">Cerrado ese día</option> : times.map((time) => <option key={time} value={time}>{formatSlotTime(time)}</option>)}</select></div><select key={branchId} name="mechanicId" defaultValue="" className="min-h-12 rounded-md border border-stone-300 bg-white px-4"><option value="">Sin mecánico asignado</option>{branchMechanics.map((mechanic) => <option key={mechanic.id} value={mechanic.id}>{mechanic.name} · {mechanic.specialty}</option>)}</select></fieldset>
    {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}<button disabled={pending || !hasClient || (creatingVehicle && !brandSelection)} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={19} />} Crear orden</button>
  </form>}</div></div>}</>;
}
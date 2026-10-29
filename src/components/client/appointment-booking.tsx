"use client";

import { CalendarSearch, CheckCircle2, LoaderCircle, MapPin, Plus, Wrench, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Option = { id: string; label: string };
type GarageOption = Option & { address?: string | null; specialty?: string | null };
/** `openOrderLabel` marks a vehicle that already has an order in progress and cannot book another. */
type VehicleOption = Option & { openOrderLabel?: string | null };

type AppointmentBookingProps = {
  garages: GarageOption[];
  vehicles: VehicleOption[];
  /** Garage of the garage link page. With this or `defaultGarageId` (client who came from a garage link) the garage is shown with "Ver más talleres"; otherwise a plain select. */
  lockedGarageId?: string;
  defaultGarageId?: string;
};

export function AppointmentBooking({ garages, vehicles, lockedGarageId, defaultGarageId }: AppointmentBookingProps) {
  const router = useRouter();
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const today = new Date().toLocaleDateString("en-CA");
  const [garageId, setGarageId] = useState(lockedGarageId ?? defaultGarageId ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);

  async function loadSlots(form: HTMLFormElement) {
    const data = new FormData(form);
    const garageId = String(data.get("garageId") ?? "");
    const date = String(data.get("date") ?? "");
    if (!garageId || !date) return setMessage({ error: "Selecciona taller y fecha." });
    setLoading(true);
    setSelectedTime("");
    setMessage({});
    const params = new URLSearchParams({ garageId, date, timezoneOffset: String(new Date().getTimezoneOffset()) });
    const response = await fetch(`/api/client/appointments/availability?${params}`);
    const result = await response.json() as { slots?: string[]; error?: string };
    setLoading(false);
    setSlots(result.slots ?? []);
    if (!response.ok) setMessage({ error: result.error ?? "No se pudo consultar la agenda." });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTime) return setMessage({ error: "Selecciona un horario disponible." });
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    setMessage({});
    const response = await fetch("/api/client/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ garageId: data.get("garageId"), vehicleId: data.get("vehicleId"), date: data.get("date"), time: selectedTime, timezoneOffset: new Date().getTimezoneOffset() }),
    });
    const result = await response.json() as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setMessage({ error: result.error ?? "No se pudo reservar la cita." });
      await loadSlots(form);
      return;
    }
    setSlots([]);
    setSelectedTime("");
    setMessage({ success: "Cita agendada correctamente." });
    router.refresh();
  }

  const garage = garages.find(({ id }) => id === garageId);
  const otherGarages = garages.filter(({ id }) => id !== garageId);

  function chooseGarage(id: string) {
    setGarageId(id);
    setPickerOpen(false);
    setSlots([]);
    setSelectedTime("");
    setMessage({});
  }

  return (
    <form onSubmit={submit} className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="grid gap-4 p-5 md:grid-cols-3">
        <div className="grid min-w-0 content-start gap-2 text-sm font-bold">
          Taller
          <input type="hidden" name="garageId" value={garageId} />
          {lockedGarageId ?? defaultGarageId ? (
            <>
              <div className="min-h-12 min-w-0 rounded-md border border-stone-200 bg-stone-100 px-3 py-2">
                <p className="truncate text-stone-800">{garage?.label ?? "Taller seleccionado"}</p>
                {garage?.specialty && <p className="truncate text-xs font-semibold text-[#d9341d]">{garage.specialty}</p>}
              </div>
              {otherGarages.length > 0 && (
                <button type="button" onClick={() => setPickerOpen(true)} className="flex items-center gap-1 justify-self-start text-xs font-bold text-[#d9341d] hover:underline"><Plus size={14} /> Ver más talleres</button>
              )}
            </>
          ) : (
            <select value={garageId} onChange={(event) => chooseGarage(event.target.value)} className="min-h-12 w-full min-w-0 truncate rounded-md border border-stone-300 bg-white px-3 font-normal" required><option value="">Seleccionar</option>{garages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          )}
        </div>
        <label className="grid min-w-0 content-start gap-2 text-sm font-bold">Vehículo<select name="vehicleId" className="min-h-12 w-full min-w-0 truncate rounded-md border border-stone-300 bg-white px-3" required><option value="">Seleccionar</option>{vehicles.map((item) => <option key={item.id} value={item.id} disabled={Boolean(item.openOrderLabel)}>{item.label}{item.openOrderLabel ? ` · En servicio: ${item.openOrderLabel}` : ""}</option>)}</select></label>
        <label className="grid min-w-0 content-start gap-2 text-sm font-bold">Fecha<input name="date" type="date" min={today} className="min-h-12 w-full min-w-0 rounded-md border border-stone-300 px-3" required /></label>
        {vehicles.some((item) => item.openOrderLabel) && <p className="-mt-1 text-xs text-stone-500 md:col-span-3">Los vehículos con un servicio en curso podrán agendar de nuevo cuando se entreguen.</p>}
        <button type="button" disabled={loading} onClick={(event) => loadSlots(event.currentTarget.form!)} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-stone-900 px-5 font-bold text-white disabled:opacity-60 md:col-span-3">{loading ? <LoaderCircle className="animate-spin" size={19} /> : <CalendarSearch size={19} />} Consultar horarios</button>
      </div>
      {slots.length > 0 && <fieldset className="border-t border-stone-200 p-5"><legend className="px-2 text-sm font-bold">Horarios disponibles</legend><div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">{slots.map((time) => <button key={time} type="button" onClick={() => setSelectedTime(time)} className={`min-h-11 rounded-md border text-sm font-bold ${selectedTime === time ? "border-[#ef3f26] bg-[#ef3f26] text-white" : "border-stone-300 bg-white"}`}>{time}</button>)}</div><button disabled={saving || !selectedTime} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={19} /> : <CheckCircle2 size={19} />} Confirmar cita</button></fieldset>}
      {!loading && slots.length === 0 && selectedTime === "" && <p className="border-t border-stone-200 p-5 text-sm text-stone-500">Consulta una fecha para ver los slots de 08:00 a 18:00.</p>}
      {message.error && <p role="alert" className="border-t border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{message.error}</p>}
      {message.success && <p role="status" className="border-t border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message.success}</p>}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="garage-picker-title" onClick={() => setPickerOpen(false)}>
          <div className="max-h-[85dvh] w-full overflow-y-auto rounded-t-lg bg-white shadow-2xl sm:max-w-lg sm:rounded-lg" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white p-4">
              <h2 id="garage-picker-title" className="text-lg font-bold">Talleres disponibles</h2>
              <button type="button" onClick={() => setPickerOpen(false)} className="grid size-10 place-items-center rounded-md hover:bg-stone-100" aria-label="Cerrar"><X size={20} /></button>
            </div>
            <ul className="divide-y divide-stone-100">
              {garages.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => chooseGarage(item.id)} className={`flex w-full items-start gap-3 p-4 text-left hover:bg-stone-50 ${item.id === garageId ? "bg-orange-50" : ""}`}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-stone-900 text-white"><Wrench size={18} /></span>
                    <span className="min-w-0">
                      <span className="block font-bold">{item.label}{item.id === garageId && <span className="ml-2 text-xs font-semibold text-[#d9341d]">Seleccionado</span>}</span>
                      {item.specialty && <span className="block text-sm font-semibold text-[#d9341d]">{item.specialty}</span>}
                      {item.address && <span className="mt-0.5 flex items-start gap-1 text-sm text-stone-500"><MapPin size={14} className="mt-0.5 shrink-0" />{item.address}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </form>
  );
}

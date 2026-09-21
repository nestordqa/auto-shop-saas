"use client";

import { CalendarSearch, CheckCircle2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Option = { id: string; label: string };

type AppointmentBookingProps = {
  garages: Option[];
  vehicles: Option[];
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

  const contextGarageId = lockedGarageId ?? defaultGarageId;
  const contextGarage = garages.find(({ id }) => id === contextGarageId);
  return (
    <form onSubmit={submit} className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="grid gap-4 p-5 md:grid-cols-3">
        {contextGarageId ? <label className="grid gap-2 text-sm font-bold">Taller<input type="hidden" name="garageId" value={contextGarageId} /><select value={contextGarageId} disabled className="min-h-12 rounded-md border border-stone-200 bg-stone-100 px-3 text-stone-800 disabled:opacity-100"><option value={contextGarageId}>{contextGarage?.label ?? "Taller seleccionado"}</option></select></label> : <label className="grid gap-2 text-sm font-bold">Taller<select name="garageId" defaultValue="" className="min-h-12 rounded-md border border-stone-300 bg-white px-3" required><option value="">Seleccionar</option>{garages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
        <label className="grid gap-2 text-sm font-bold">Vehículo<select name="vehicleId" className="min-h-12 rounded-md border border-stone-300 bg-white px-3" required><option value="">Seleccionar</option>{vehicles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">Fecha<input name="date" type="date" min={today} className="min-h-12 rounded-md border border-stone-300 px-3" required /></label>
        <button type="button" disabled={loading} onClick={(event) => loadSlots(event.currentTarget.form!)} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-stone-900 px-5 font-bold text-white disabled:opacity-60 md:col-span-3">{loading ? <LoaderCircle className="animate-spin" size={19} /> : <CalendarSearch size={19} />} Consultar horarios</button>
      </div>
      {slots.length > 0 && <fieldset className="border-t border-stone-200 p-5"><legend className="px-2 text-sm font-bold">Horarios disponibles</legend><div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">{slots.map((time) => <button key={time} type="button" onClick={() => setSelectedTime(time)} className={`min-h-11 rounded-md border text-sm font-bold ${selectedTime === time ? "border-[#ef3f26] bg-[#ef3f26] text-white" : "border-stone-300 bg-white"}`}>{time}</button>)}</div><button disabled={saving || !selectedTime} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={19} /> : <CheckCircle2 size={19} />} Confirmar cita</button></fieldset>}
      {!loading && slots.length === 0 && selectedTime === "" && <p className="border-t border-stone-200 p-5 text-sm text-stone-500">Consulta una fecha para ver los slots de 08:00 a 18:00.</p>}
      {message.error && <p role="alert" className="border-t border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{message.error}</p>}
      {message.success && <p role="status" className="border-t border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message.success}</p>}
    </form>
  );
}

"use client";

import { Clock, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatSlotTime, HALF_HOURS, WEEKDAY_LABELS, WEEKDAY_ORDER, type WeekSchedule } from "@/lib/schedule";

const select = "min-h-10 rounded-md border border-stone-300 bg-white px-2 text-sm disabled:bg-stone-100 disabled:text-stone-400";

/** Opening hours of one branch (owner or its manager). Clients can only book inside these hours. */
export function ScheduleEditor({ branchId, branchName, schedule }: { branchId: string; branchName: string | null; schedule: WeekSchedule }) {
  const router = useRouter();
  const [days, setDays] = useState(schedule);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ error?: string; success?: string }>({});

  const update = (weekday: number, value: WeekSchedule[number]) => setDays((current) => current.map((day, index) => index === weekday ? value : day));

  function copyToWeekdays(weekday: number) {
    setDays((current) => current.map((day, index) => index >= 1 && index <= 5 ? current[weekday] : day));
  }

  async function save() {
    setPending(true);
    setNotice({});
    const response = await fetch(`/api/owner/branches/${branchId}/schedule`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schedule: days }) });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return setNotice({ error: result.error ?? "No se pudo guardar el horario." });
    setNotice({ success: "Horario guardado. Los clientes ya ven los nuevos horarios." });
    router.refresh();
  }

  return (
    <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Clock size={20} className="text-[#ef3f26]" /> Horario de atención{branchName && <span className="text-base font-semibold text-stone-500">· {branchName}</span>}</h2>
      <p className="mt-1 text-sm text-stone-600">Los clientes pueden agendar cada 30 minutos, desde la apertura hasta antes del cierre.</p>
      <div className="mt-4 divide-y divide-stone-100 rounded-md border border-stone-200">
        {WEEKDAY_ORDER.map((weekday) => {
          const day = days[weekday];
          return (
            <div key={weekday} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <label className="flex w-32 items-center gap-2 text-sm font-bold"><input type="checkbox" checked={Boolean(day)} onChange={(event) => update(weekday, event.target.checked ? { open: "08:00", close: "18:00" } : null)} className="size-5 accent-[#ef3f26]" /> {WEEKDAY_LABELS[weekday]}</label>
              {day ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select aria-label={`Apertura ${WEEKDAY_LABELS[weekday]}`} value={day.open} onChange={(event) => update(weekday, { ...day, open: event.target.value })} className={select}>{HALF_HOURS.map((time) => <option key={time} value={time}>{formatSlotTime(time)}</option>)}</select>
                  <span className="text-sm text-stone-500">a</span>
                  <select aria-label={`Cierre ${WEEKDAY_LABELS[weekday]}`} value={day.close} onChange={(event) => update(weekday, { ...day, close: event.target.value })} className={select}>{HALF_HOURS.filter((time) => time > day.open).map((time) => <option key={time} value={time}>{formatSlotTime(time)}</option>)}</select>
                  {weekday === 1 && <button type="button" onClick={() => copyToWeekdays(1)} className="text-xs font-bold text-[#d9341d] hover:underline">Copiar a martes–viernes</button>}
                </div>
              ) : <span className="text-sm text-stone-500">Cerrado</span>}
            </div>
          );
        })}
      </div>
      {notice.error && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{notice.error}</p>}
      {notice.success && <p role="status" className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice.success}</p>}
      <button type="button" disabled={pending} onClick={save} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-900 px-5 font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={18} />} Guardar horario</button>
    </section>
  );
}

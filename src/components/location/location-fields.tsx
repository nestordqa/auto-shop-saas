"use client";

import { useState, type ReactNode } from "react";

import { DEFAULT_COUNTRY, OTHER_CITY, type LocationValue, type StateOption } from "@/lib/locations";

const field = "min-h-12 w-full min-w-0 rounded-md border border-stone-300 bg-white px-4 font-normal";

/**
 * País (fixed: Venezuela), Estado and Ciudad with "Otra ciudad…". Submits `stateId`, `cityId` and `otherCity`.
 * `labels` shows a caption over each field (settings forms); without it, placeholders only (sign-up forms).
 */
export function LocationFields({ states, defaultValue, labels = false, className = "" }: { states: StateOption[]; defaultValue?: LocationValue | null; labels?: boolean; className?: string }) {
  const [stateId, setStateId] = useState(defaultValue?.stateId ?? "");
  const [cityId, setCityId] = useState(defaultValue?.cityId ?? "");
  const cities = states.find((state) => state.id === stateId)?.cities ?? [];
  const wrap = (label: string, control: ReactNode) => labels ? <label className="grid min-w-0 gap-1 text-sm font-bold">{label}{control}</label> : control;

  return (
    <div className={`grid gap-3 sm:grid-cols-3 ${className}`}>
      {wrap("País", <input value={DEFAULT_COUNTRY.name} readOnly disabled aria-label="País" title="Por ahora TorkeOS opera solo en Venezuela." className={`${field} bg-stone-100 text-stone-500`} />)}
      {wrap("Estado", <select name="stateId" required value={stateId} onChange={(event) => { setStateId(event.target.value); setCityId(""); }} aria-label="Estado" className={field}><option value="">Estado</option>{states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}</select>)}
      {wrap("Ciudad", <select name="cityId" required value={cityId} onChange={(event) => setCityId(event.target.value)} disabled={!stateId} aria-label="Ciudad" className={`${field} disabled:bg-stone-100`}><option value="">{stateId ? "Ciudad" : "Elige el estado primero"}</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}<option value={OTHER_CITY}>Otra ciudad…</option></select>)}
      {cityId === OTHER_CITY && <input name="otherCity" required minLength={2} maxLength={80} placeholder="Escribe el nombre de la ciudad" aria-label="Otra ciudad" className={`${field} sm:col-span-3`} autoFocus />}
    </div>
  );
}

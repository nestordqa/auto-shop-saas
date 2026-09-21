"use client";

import { CarFront, LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Brand = { id: string; name: string };
type Model = { id: string; brandId: string; name: string };
const years = Array.from({ length: new Date().getFullYear() - 1899 }, (_, index) => new Date().getFullYear() - index);

export function ClientVehicleCreate({ brands, models }: { brands: Brand[]; models: Model[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const availableModels = models.filter((model) => model.brandId === brandId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/client/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId: values.modelId, year: Number(values.year), color: values.color, plate: values.plate }) });
    const result = await response.json() as { error?: string };
    setPending(false);
    if (!response.ok) return setError(result.error ?? "No se pudo registrar el vehículo.");
    setOpen(false);
    router.refresh();
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white"><Plus size={19} /> Agregar vehículo</button>;
  return <form onSubmit={submit} className="grid gap-3 rounded-lg border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-2"><div className="flex items-center gap-2 sm:col-span-2"><CarFront className="text-[#d9341d]" /><h3 className="text-lg font-bold">Registrar vehículo</h3></div><select value={brandId} onChange={(event) => setBrandId(event.target.value)} required className="min-h-12 rounded-md border border-stone-300 bg-white px-3"><option value="">Marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select><select name="modelId" key={brandId} required className="min-h-12 rounded-md border border-stone-300 bg-white px-3"><option value="">Modelo</option>{availableModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select><select name="year" defaultValue={new Date().getFullYear()} className="min-h-12 rounded-md border border-stone-300 bg-white px-3">{years.map((year) => <option key={year}>{year}</option>)}</select><input name="color" required minLength={2} placeholder="Color" className="min-h-12 rounded-md border border-stone-300 px-3" /><input name="plate" required minLength={3} placeholder="Placa" className="min-h-12 rounded-md border border-stone-300 px-3 uppercase sm:col-span-2" />{error && <p role="alert" className="text-sm font-semibold text-red-700 sm:col-span-2">{error}</p>}<div className="grid gap-2 sm:col-span-2 sm:grid-cols-2"><button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-md border border-stone-300 font-bold">Cancelar</button><button disabled={pending || !availableModels.length} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] font-bold text-white disabled:opacity-60">{pending && <LoaderCircle className="animate-spin" size={19} />} Guardar vehículo</button></div></form>;
}
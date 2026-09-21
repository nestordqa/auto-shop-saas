"use client";

import { CarFront, LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Brand = { id: string; name: string; countryCode: string | null };
type Model = { id: string; brandId: string; name: string };
type VehicleCatalogManagerProps = {
  brands: Brand[];
  models: Model[];
};

export function VehicleCatalogManager({ brands, models }: VehicleCatalogManagerProps) {
  const router = useRouter();
  const [selectedBrand, setSelectedBrand] = useState(brands[0]?.id ?? "");
  const availableModels = models.filter((model) => model.brandId === selectedBrand);
  const [selectedModel, setSelectedModel] = useState(availableModels[0]?.id ?? "__new__");
  const [pendingType, setPendingType] = useState<string>();
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});

  async function createItem(type: "brand" | "model", event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingType(type);
    setMessage({});
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = type === "brand"
      ? { type, name: formData.get("name"), countryCode: formData.get("countryCode") }
      : { type, brandId: formData.get("brandId"), name: formData.get("name") };
    const response = await fetch("/api/admin/vehicle-catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { error?: string };
    setPendingType(undefined);
    if (!response.ok) {
      setMessage({ error: result.error ?? "No se pudo guardar." });
      return;
    }
    form.reset();
    setMessage({ success: "Catálogo actualizado." });
    router.refresh();
  }

  function changeBrand(brandId: string) {
    setSelectedBrand(brandId);
    setSelectedModel(models.find((model) => model.brandId === brandId)?.id ?? "__new__");
  }

  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-stone-200 p-5">
        <span className="grid size-10 place-items-center rounded-md bg-stone-900 text-white"><CarFront size={20} /></span>
        <div><h2 className="text-xl font-bold">Agregar al catálogo</h2><p className="text-sm text-stone-500">Crea marcas o asigna nuevos modelos.</p></div>
      </div>
      <div className="grid gap-0 divide-y divide-stone-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <form onSubmit={(event) => createItem("brand", event)} className="grid content-start gap-3 p-5">
          <h3 className="font-bold">1. Nueva marca</h3>
          <input name="name" required minLength={2} placeholder="Ej. Toyota" className="min-h-12 rounded-md border border-stone-300 px-4 outline-none focus:border-[#ef3f26]" />
          <input name="countryCode" maxLength={2} placeholder="País ISO, ej. JP" className="min-h-12 rounded-md border border-stone-300 px-4 uppercase outline-none focus:border-[#ef3f26]" />
          <button disabled={Boolean(pendingType)} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-4 font-bold text-white disabled:opacity-60">{pendingType === "brand" ? <LoaderCircle className="animate-spin" size={19} /> : <Plus size={19} />} Agregar marca</button>
        </form>
        <form onSubmit={(event) => createItem("model", event)} className="grid content-start gap-3 p-5">
          <h3 className="font-bold">2. Marca y modelo</h3>
          <select name="brandId" required value={selectedBrand} onChange={(event) => changeBrand(event.target.value)} className="min-h-12 rounded-md border border-stone-300 bg-white px-4 outline-none focus:border-[#ef3f26]"><option value="">Selecciona marca</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select>
          <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} className="min-h-12 rounded-md border border-stone-300 bg-white px-4 outline-none focus:border-[#ef3f26]">
            {availableModels.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
            <option value="__new__">+ Agregar nuevo modelo</option>
          </select>
          {selectedModel === "__new__" && (
            <>
              <input name="name" required placeholder="Ej. Corolla" className="min-h-12 rounded-md border border-stone-300 px-4 outline-none focus:border-[#ef3f26]" />
              <button disabled={Boolean(pendingType) || !selectedBrand} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-stone-900 px-4 font-bold text-white disabled:opacity-50">{pendingType === "model" ? <LoaderCircle className="animate-spin" size={19} /> : <Plus size={19} />} Agregar modelo</button>
            </>
          )}
        </form>
      </div>
      {(message.error || message.success) && <p role="status" className={`border-t p-4 text-center text-sm font-semibold ${message.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message.error ?? message.success}</p>}
      <div className="border-t border-stone-200 bg-stone-50 p-5 text-sm text-stone-600">
        {brands.length} marcas · {models.length} modelos
      </div>
    </section>
  );
}
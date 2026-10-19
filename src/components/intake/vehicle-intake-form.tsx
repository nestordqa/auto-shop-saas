"use client";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Car,
  Check,
  ClipboardCheck,
  Fuel,
  Gauge,
  ImagePlus,
  ListChecks,
  LoaderCircle,
  PenLine,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent } from "react";

import { CarDiagram } from "@/components/intake/car-diagram";
import { SignaturePad } from "@/components/intake/signature-pad";
import {
  CAR_VIEWS,
  DAMAGE_TYPES,
  DAMAGE_TYPE_BY_KEY,
  DEFAULT_INTAKE_ACCESSORIES,
  FUEL_LABELS,
  MAX_INTAKE_PHOTOS,
  type CarViewKey,
  type DamageTypeKey,
  type IntakeDamage,
  type IntakeInput,
} from "@/lib/intake";

const STEPS = [
  { title: "Vehículo", icon: Gauge },
  { title: "Accesorios", icon: ListChecks },
  { title: "Carrocería", icon: Car },
  { title: "Fotos y notas", icon: Camera },
  { title: "Entrega", icon: PenLine },
];

type Photo = { id: string; key?: string; previewUrl: string; caption: string; status: "uploading" | "done" | "error" };

type VehicleIntakeFormProps = {
  orderId: string;
  vehicleLabel: string;
  customerName: string;
  storageEnabled: boolean;
};

const inputClass = "min-h-12 w-full rounded-md border border-stone-300 bg-white px-4 text-base outline-none focus:border-[#ef3f26] focus:ring-2 focus:ring-[#ef3f26]/20";

async function compressImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("compress"))), "image/jpeg", 0.82));
}

export function VehicleIntakeForm({ orderId, vehicleLabel, customerName, storageEnabled }: VehicleIntakeFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const [mileage, setMileage] = useState("");
  const [fuelLevel, setFuelLevel] = useState(4);
  const [vin, setVin] = useState("");
  const [engineNumber, setEngineNumber] = useState("");
  const [hasRegistration, setHasRegistration] = useState(true);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [reportedIssue, setReportedIssue] = useState("");
  const [accessories, setAccessories] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DEFAULT_INTAKE_ACCESSORIES.map((item) => [item.key, true])),
  );
  const [damages, setDamages] = useState<IntakeDamage[]>([]);
  const [view, setView] = useState<CarViewKey>("izquierda");
  const [damageType, setDamageType] = useState<DamageTypeKey>("rayon");
  const [selectedDamage, setSelectedDamage] = useState<string>();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [observations, setObservations] = useState("");
  const [deliveredByName, setDeliveredByName] = useState(customerName);
  const [signature, setSignature] = useState<string | null>(null);
  const [receiverSignature, setReceiverSignature] = useState<string | null>(null);

  const numbering = useMemo(() => new Map(damages.map((damage, index) => [damage.id, index + 1])), [damages]);
  const missingAccessories = DEFAULT_INTAKE_ACCESSORIES.filter((item) => !accessories[item.key]);
  const uploading = photos.some((photo) => photo.status === "uploading");

  function validate(target: number) {
    if (target >= 1) {
      const km = Number(mileage);
      if (mileage.trim() === "" || !Number.isInteger(km) || km < 0) return "Indica el kilometraje actual del vehículo.";
      if (reportedIssue.trim().length < 3) return "Describe la falla o el servicio que solicita el cliente.";
    }
    return undefined;
  }

  function goTo(target: number) {
    const message = target > step ? validate(target) : undefined;
    setError(message);
    if (!message) {
      setStep(target);
      window.scrollTo({ top: Math.max(0, (document.getElementById("intake-form")?.offsetTop ?? 0) - 80), behavior: "smooth" });
    }
  }

  function addDamage(point: { x: number; y: number }) {
    const damage: IntakeDamage = { id: crypto.randomUUID().slice(0, 8), view, type: damageType, ...point };
    setDamages((current) => [...current, damage]);
    setSelectedDamage(damage.id);
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, MAX_INTAKE_PHOTOS - photos.length);
    event.target.value = "";
    for (const file of files) {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setPhotos((current) => [...current, { id, previewUrl, caption: "", status: "uploading" }]);
      try {
        const blob = await compressImage(file);
        const response = await fetch(`/api/orders/${orderId}/intake/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: "image/jpeg", size: blob.size }),
        });
        const result = await response.json() as { key?: string; uploadUrl?: string; error?: string };
        if (!response.ok || !result.key || !result.uploadUrl) throw new Error(result.error);
        const upload = await fetch(result.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: blob });
        if (!upload.ok) throw new Error();
        setPhotos((current) => current.map((photo) => (photo.id === id ? { ...photo, key: result.key, status: "done" } : photo)));
      } catch (uploadError) {
        setError(uploadError instanceof Error && uploadError.message ? uploadError.message : "No se pudo subir una foto. Intenta de nuevo.");
        setPhotos((current) => current.map((photo) => (photo.id === id ? { ...photo, status: "error" } : photo)));
      }
    }
  }

  async function submit() {
    if (deliveredByName.trim().length < 2) return setError("Indica el nombre de quien entrega el vehículo.");
    const firstError = validate(1);
    if (firstError) {
      setStep(0);
      return setError(firstError);
    }
    setSubmitting(true);
    setError(undefined);
    const body: IntakeInput = {
      mileage: Number(mileage),
      fuelLevel,
      vin: vin.trim() || undefined,
      engineNumber: engineNumber.trim() || undefined,
      hasRegistration,
      hasInsurance,
      accessories: DEFAULT_INTAKE_ACCESSORIES.map((item) => ({ key: item.key, label: item.label, present: Boolean(accessories[item.key]) })),
      damages,
      photos: photos.filter((photo) => photo.status === "done" && photo.key).map((photo) => ({ key: photo.key!, caption: photo.caption.trim() || undefined })),
      reportedIssue: reportedIssue.trim(),
      observations: observations.trim() || undefined,
      deliveredByName: deliveredByName.trim(),
      customerSignature: signature,
      receiverSignature,
    };
    const response = await fetch(`/api/orders/${orderId}/intake`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as { error?: string };
    setSubmitting(false);
    if (!response.ok) return setError(result.error ?? "No se pudo guardar el formato de ingreso.");
    router.refresh();
  }

  return (
    <section id="intake-form" className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <header className="bg-[#171a1f] px-4 py-5 text-white sm:px-6">
        <p className="flex items-center gap-2 text-xs font-bold uppercase text-[#ff765f]"><ClipboardCheck size={16} /> Formato de ingreso</p>
        <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{vehicleLabel}</h2>
        <ol className="mt-5 grid grid-cols-5 gap-1.5" aria-label="Pasos del formato">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            const state = index < step ? "done" : index === step ? "current" : "todo";
            return (
              <li key={item.title}>
                <button
                  type="button"
                  onClick={() => (index < step ? goTo(index) : undefined)}
                  className="group flex w-full flex-col items-center gap-2 text-center"
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <span className="relative h-1 w-full overflow-hidden rounded-full bg-white/15">
                    <span className={`absolute inset-y-0 left-0 bg-[#ef3f26] transition-all duration-500 ${state === "todo" ? "w-0" : "w-full"}`} />
                  </span>
                  <span className={`grid size-9 place-items-center rounded-full transition-all duration-300 ${state === "current" ? "scale-110 bg-[#ef3f26] text-white shadow-[0_0_20px_rgba(239,63,38,0.6)]" : state === "done" ? "bg-white text-stone-900" : "bg-white/10 text-stone-400"}`}>
                    {state === "done" ? <Check size={17} /> : <Icon size={17} />}
                  </span>
                  <span className={`hidden text-xs font-bold sm:block ${state === "todo" ? "text-stone-500" : "text-white"}`}>{item.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </header>

      <div key={step} className="intake-step p-4 sm:p-6">
        <h3 className="font-display text-2xl font-bold">{STEPS[step].title}</h3>

        {step === 0 && (
          <div className="mt-4 grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold">
                Kilometraje actual
                <div className="relative">
                  <input inputMode="numeric" value={mileage} onChange={(event) => setMileage(event.target.value.replace(/\D/g, "").slice(0, 7))} maxLength={7} placeholder="Ej. 85400" className={`${inputClass} pr-12 font-display text-xl`} />
                  <span className="absolute inset-y-0 right-4 grid place-items-center text-stone-400">km</span>
                </div>
              </label>
              <div className="grid gap-1.5 text-sm font-bold">
                <span className="flex items-center gap-2"><Fuel size={16} /> Nivel de combustible · <span className="text-[#d9341d]">{FUEL_LABELS[fuelLevel]}</span></span>
                <div className="grid min-h-12 grid-cols-9 gap-1 rounded-md border border-stone-300 p-1.5" role="radiogroup" aria-label="Nivel de combustible">
                  {FUEL_LABELS.map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={fuelLevel === index}
                      aria-label={label}
                      onClick={() => setFuelLevel(index)}
                      className={`rounded-sm transition-all duration-300 ${index <= fuelLevel ? (fuelLevel <= 1 ? "bg-red-500" : fuelLevel <= 3 ? "bg-amber-400" : "bg-emerald-500") : "bg-stone-100"} ${fuelLevel === index ? "scale-y-110" : ""}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold">Serial de carrocería (VIN) <span className="font-normal text-stone-500">Opcional</span><input value={vin} onChange={(event) => setVin(event.target.value.toUpperCase())} className={inputClass} /></label>
              <label className="grid gap-1.5 text-sm font-bold">Serial del motor <span className="font-normal text-stone-500">Opcional</span><input value={engineNumber} onChange={(event) => setEngineNumber(event.target.value.toUpperCase())} className={inputClass} /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="Carnet de circulación" checked={hasRegistration} onChange={setHasRegistration} />
              <Toggle label="Póliza de seguro" checked={hasInsurance} onChange={setHasInsurance} />
            </div>
            <label className="grid gap-1.5 text-sm font-bold">
              Falla o servicio que solicita el cliente
              <textarea value={reportedIssue} onChange={(event) => setReportedIssue(event.target.value)} rows={4} placeholder="Ej. Recalienta en tráfico, el ventilador no prende." className="min-h-28 w-full resize-none rounded-md border border-stone-300 px-4 py-3 text-base outline-none focus:border-[#ef3f26] focus:ring-2 focus:ring-[#ef3f26]/20" />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="mt-2">
            <p className="text-sm text-stone-600">Desmarca lo que el vehículo <strong>no</strong> trae. Faltan <strong className="text-[#d9341d]">{missingAccessories.length}</strong> de {DEFAULT_INTAKE_ACCESSORIES.length}.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setAccessories(Object.fromEntries(DEFAULT_INTAKE_ACCESSORIES.map((item) => [item.key, true])))} className="min-h-10 rounded-md border border-stone-300 px-3 text-sm font-bold">Marcar todos</button>
              <button type="button" onClick={() => setAccessories({})} className="min-h-10 rounded-md border border-stone-300 px-3 text-sm font-bold">Ninguno</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {DEFAULT_INTAKE_ACCESSORIES.map((item) => {
                const present = Boolean(accessories[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={present}
                    onClick={() => setAccessories((current) => ({ ...current, [item.key]: !present }))}
                    className={`flex min-h-12 items-center gap-2 rounded-md border px-3 text-left text-sm font-semibold transition-all duration-200 active:scale-95 ${present ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-800 line-through decoration-red-300"}`}
                  >
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full transition-colors ${present ? "bg-emerald-600 text-white" : "bg-red-200 text-red-700"}`}>{present ? <Check size={14} /> : <X size={14} />}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-2">
            <p className="text-sm text-stone-600">Elige el tipo de daño y toca el diagrama donde está. Toca un punto para seleccionarlo.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DAMAGE_TYPES.map((type) => (
                <button key={type.key} type="button" onClick={() => setDamageType(type.key)} className={`flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-bold transition ${damageType === type.key ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`}>
                  <span className="size-3 rounded-full" style={{ background: type.color }} /> {type.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-1 overflow-x-auto rounded-md bg-stone-100 p-1">
              {CAR_VIEWS.map((item) => {
                const count = damages.filter((damage) => damage.view === item.key).length;
                return (
                  <button key={item.key} type="button" onClick={() => setView(item.key)} className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded px-3 text-sm font-bold transition ${view === item.key ? "bg-white shadow-sm" : "text-stone-500"}`}>
                    {item.label}{count > 0 && <span className="grid size-5 place-items-center rounded-full bg-[#ef3f26] text-[11px] text-white">{count}</span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 rounded-lg border border-stone-200 bg-[radial-gradient(circle,#e7e5e4_1px,transparent_1px)] bg-size-[14px_14px] p-3 text-stone-700 sm:p-6">
              <CarDiagram view={view} damages={damages} onAdd={addDamage} onSelect={setSelectedDamage} selectedId={selectedDamage} numbering={numbering} className="mx-auto max-w-2xl" />
            </div>
            {damages.length > 0 ? (
              <ul className="mt-4 grid gap-2">
                {damages.map((damage) => {
                  const type = DAMAGE_TYPE_BY_KEY.get(damage.type);
                  return (
                    <li key={damage.id} className={`flex items-center gap-3 rounded-md border p-2 transition ${selectedDamage === damage.id ? "border-[#ef3f26] bg-red-50/50" : "border-stone-200"}`}>
                      <span className="grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: type?.color }}>{numbering.get(damage.id)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{type?.label} · <span className="font-normal text-stone-500">{CAR_VIEWS.find((item) => item.key === damage.view)?.label}</span></p>
                        <input
                          value={damage.note ?? ""}
                          onChange={(event) => setDamages((current) => current.map((item) => (item.id === damage.id ? { ...item, note: event.target.value } : item)))}
                          onFocus={() => setSelectedDamage(damage.id)}
                          placeholder="Nota (opcional)"
                          maxLength={160}
                          className="mt-1 min-h-9 w-full rounded border border-stone-200 px-2 text-sm"
                        />
                      </div>
                      <button type="button" onClick={() => setDamages((current) => current.filter((item) => item.id !== damage.id))} aria-label="Eliminar daño" className="grid size-10 shrink-0 place-items-center rounded-md text-stone-400 hover:bg-red-50 hover:text-red-700"><Trash2 size={18} /></button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Sin daños marcados. Si la carrocería está en buen estado, continúa.</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="mt-4 grid gap-5">
            {storageEnabled ? (
              <div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {photos.map((photo) => (
                    <figure key={photo.id} className="group relative overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                      <img src={photo.previewUrl} alt="" className={`aspect-square w-full object-cover transition ${photo.status === "uploading" ? "opacity-50 blur-[1px]" : ""}`} />
                      {photo.status === "uploading" && <span className="absolute inset-0 grid place-items-center"><LoaderCircle className="animate-spin text-white drop-shadow" size={28} /></span>}
                      {photo.status === "error" && <span className="absolute inset-x-0 top-0 bg-red-600 p-1 text-center text-xs font-bold text-white">Error al subir</span>}
                      <button type="button" onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))} aria-label="Quitar foto" className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-black/60 text-white"><X size={16} /></button>
                      <input value={photo.caption} onChange={(event) => setPhotos((current) => current.map((item) => (item.id === photo.id ? { ...item, caption: event.target.value } : item)))} placeholder="Descripción" maxLength={120} className="w-full border-t border-stone-200 px-2 py-2 text-xs" />
                    </figure>
                  ))}
                  {photos.length < MAX_INTAKE_PHOTOS && (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-stone-300 text-sm font-bold text-stone-500 transition hover:border-[#ef3f26] hover:text-[#d9341d]">
                      <ImagePlus size={28} />
                      Agregar fotos
                      <input type="file" accept="image/*" capture="environment" multiple onChange={addPhotos} className="sr-only" />
                    </label>
                  )}
                </div>
                <p className="mt-2 text-xs text-stone-500">Hasta {MAX_INTAKE_PHOTOS} fotos. Se comprimen antes de subir para ahorrar datos.</p>
              </div>
            ) : (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">El almacenamiento de fotos no está configurado. Puedes continuar sin fotos.</p>
            )}
            <label className="grid gap-1.5 text-sm font-bold">
              Observaciones
              <textarea value={observations} onChange={(event) => setObservations(event.target.value)} rows={4} placeholder="Objetos de valor, ruidos, testigos encendidos en el tablero…" className="min-h-28 w-full resize-none rounded-md border border-stone-300 px-4 py-3 text-base outline-none focus:border-[#ef3f26] focus:ring-2 focus:ring-[#ef3f26]/20" />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="mt-4 grid gap-5">
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Summary label="Kilometraje" value={`${Number(mileage || 0).toLocaleString("es-VE")} km`} />
              <Summary label="Combustible" value={FUEL_LABELS[fuelLevel]} />
              <Summary label="Accesorios faltantes" value={String(missingAccessories.length)} />
              <Summary label="Daños marcados" value={String(damages.length)} />
            </dl>
            <label className="grid gap-1.5 text-sm font-bold">
              Nombre de quien entrega el vehículo
              <input value={deliveredByName} onChange={(event) => setDeliveredByName(event.target.value)} className={inputClass} />
            </label>
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-1.5 text-sm font-bold">Firma de quien entrega</p>
                <SignaturePad onChange={setSignature} />
                <p className="mt-1 text-xs text-stone-500">Al firmar, el cliente confirma el estado del vehículo, los accesorios y los daños registrados.</p>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-bold">Firma de quien recibe por el taller</p>
                <SignaturePad onChange={setReceiverSignature} />
                <p className="mt-1 text-xs text-stone-500">El taller se hace responsable del vehículo en las condiciones registradas.</p>
              </div>
            </div>
          </div>
        )}

        {error && <p role="alert" className="mt-5 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      </div>

      <footer className="flex gap-3 border-t border-stone-200 bg-stone-50 p-4 sm:px-6">
        {step > 0 && (
          <button type="button" onClick={() => goTo(step - 1)} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 font-bold">
            <ArrowLeft size={18} /> <span className="hidden sm:inline">Atrás</span>
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={() => goTo(step + 1)} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-stone-900 px-5 font-bold text-white">
            Continuar <ArrowRight size={18} />
          </button>
        ) : (
          <button type="button" disabled={submitting || uploading} onClick={submit} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-[#ef3f26] px-5 font-bold text-white hover:bg-[#d9341d] disabled:opacity-60">
            {submitting ? <LoaderCircle className="animate-spin" size={19} /> : <ClipboardCheck size={19} />}
            {uploading ? "Subiendo fotos…" : "Guardar e ingresar vehículo"}
          </button>
        )}
      </footer>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-md border border-stone-300 px-4 py-3">
      <span className="text-sm font-bold">{label}</span>
      <span className="relative inline-flex">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
        <span className="h-7 w-12 rounded-full bg-stone-300 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-[#ef3f26]" />
        <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-stone-100 p-3">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-0.5 font-display text-xl font-bold">{value}</dd>
    </div>
  );
}

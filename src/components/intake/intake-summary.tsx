import { Check, ClipboardCheck, FileDown, FileText, Fuel, Gauge, ShieldCheck, X } from "lucide-react";

import { CarDiagram } from "@/components/intake/car-diagram";
import { CAR_VIEWS, DAMAGE_TYPE_BY_KEY, FUEL_LABELS, type VehicleIntake } from "@/lib/intake";

const dateTime = new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Caracas" });

type IntakeSummaryProps = {
  intake: VehicleIntake;
  vehicleLabel: string;
  garageName?: string;
  orderReference: string;
  /** Rendered collapsed inside a <details> unless `defaultOpen`. */
  defaultOpen?: boolean;
  /** Shows the PDF download link (owners, managers and the vehicle's client). */
  downloadable?: boolean;
};

export function IntakeSummary({ intake, vehicleLabel, garageName, orderReference, defaultOpen = false, downloadable = true }: IntakeSummaryProps) {
  const missing = intake.accessories.filter((item) => !item.present);

  return (
    <details open={defaultOpen} className="group mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-stone-900 text-white"><ClipboardCheck size={20} /></span>
          <span>
            <span className="block font-bold">Formato de ingreso</span>
            <span className="block text-xs text-stone-500">{dateTime.format(new Date(intake.createdAt))} · {intake.mileage.toLocaleString("es-VE")} km · {intake.damages.length} daños · {missing.length} faltantes</span>
          </span>
        </span>
        <span className="flex items-center gap-3">
          {downloadable && (
            <a href={`/print/intake/${intake.id}`} target="_blank" rel="noopener" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700 hover:bg-stone-50">
              <FileDown size={16} /> PDF
            </a>
          )}
          <span className="hidden text-sm font-bold text-[#d9341d] group-open:hidden sm:inline">Ver</span>
          <span className="hidden text-sm font-bold text-stone-500 sm:group-open:inline">Ocultar</span>
        </span>
      </summary>

      <div className="border-t border-stone-200 p-4 sm:p-6">
        <IntakeDocument intake={intake} vehicleLabel={vehicleLabel} garageName={garageName} orderReference={orderReference} />
      </div>
    </details>
  );
}

/** The intake form contents; shared by the collapsible summary and the printable document. */
export function IntakeDocument({ intake, vehicleLabel, garageName, orderReference }: Omit<IntakeSummaryProps, "defaultOpen" | "downloadable">) {
  const numbering = new Map(intake.damages.map((damage, index) => [damage.id, index + 1]));
  const missing = intake.accessories.filter((item) => !item.present);
  const present = intake.accessories.filter((item) => item.present);
  const viewsWithDamage = CAR_VIEWS.filter((view) => intake.damages.some((damage) => damage.view === view.key));

  return (
    <>
        <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-[#d9341d]">{garageName ? `${garageName} · ` : ""}Orden {orderReference}</p>
          <h3 className="mt-1 font-display text-2xl font-bold">{vehicleLabel}</h3>
          <p className="text-sm text-stone-500">Recibido el {dateTime.format(new Date(intake.createdAt))}{intake.receivedByName ? ` por ${intake.receivedByName}` : ""}</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact icon={Gauge} label="Kilometraje" value={`${intake.mileage.toLocaleString("es-VE")} km`} />
        <Fact icon={Fuel} label="Combustible" value={FUEL_LABELS[intake.fuelLevel] ?? "—"} />
        <Fact icon={FileText} label="Carnet de circulación" value={intake.hasRegistration ? "Sí" : "No"} />
        <Fact icon={ShieldCheck} label="Póliza de seguro" value={intake.hasInsurance ? "Sí" : "No"} />
      </dl>
      {(intake.vin || intake.engineNumber) && (
        <p className="mt-3 text-sm text-stone-600">
          {intake.vin && <>VIN: <strong>{intake.vin}</strong></>}
          {intake.vin && intake.engineNumber && " · "}
          {intake.engineNumber && <>Motor: <strong>{intake.engineNumber}</strong></>}
        </p>
      )}

      <section className="mt-5 rounded-md border-l-4 border-[#ef3f26] bg-stone-50 p-4">
        <h4 className="text-xs font-bold uppercase text-stone-500">Falla reportada por el cliente</h4>
        <p className="mt-1 whitespace-pre-line font-semibold">{intake.reportedIssue}</p>
      </section>

      <section className="mt-5">
        <h4 className="font-bold">Accesorios <span className="font-normal text-stone-500">· {present.length} presentes, {missing.length} faltantes</span></h4>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {missing.map((item) => <li key={item.key} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-800"><X size={12} /> {item.label}</li>)}
          {present.map((item) => <li key={item.key} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"><Check size={12} /> {item.label}</li>)}
        </ul>
      </section>

      <section className="mt-5">
        <h4 className="font-bold">Carrocería e interiores</h4>
        {viewsWithDamage.length ? (
          <>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {viewsWithDamage.map((view) => (
                <figure key={view.key} className="rounded-md border border-stone-200 p-3 text-stone-600">
                  <CarDiagram view={view.key} damages={intake.damages} numbering={numbering} />
                  <figcaption className="mt-1 text-center text-xs font-bold text-stone-500">{view.label}</figcaption>
                </figure>
              ))}
            </div>
            <ol className="mt-3 grid gap-1.5 text-sm">
              {intake.damages.map((damage) => {
                const type = DAMAGE_TYPE_BY_KEY.get(damage.type);
                return (
                  <li key={damage.id} className="flex items-start gap-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: type?.color }}>{numbering.get(damage.id)}</span>
                    <span><strong>{type?.label}</strong> · {CAR_VIEWS.find((view) => view.key === damage.view)?.label}{damage.note ? ` — ${damage.note}` : ""}</span>
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <p className="mt-2 text-sm text-stone-600">Sin daños registrados al ingreso.</p>
        )}
      </section>

      {intake.photos.length > 0 && (
        <section className="mt-5">
          <h4 className="font-bold">Fotos ({intake.photos.length})</h4>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {intake.photos.map((photo) => (
              <figure key={photo.key} className="overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                {photo.url ? (
                  <a href={photo.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed Storage URL */}
                    <img src={photo.url} alt={photo.caption ?? "Foto de ingreso"} loading="lazy" className="aspect-square w-full object-cover transition hover:scale-105" />
                  </a>
                ) : (
                  <div className="grid aspect-square place-items-center text-xs text-stone-500">Foto no disponible</div>
                )}
                {photo.caption && <figcaption className="p-2 text-xs">{photo.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}

      {intake.observations && (
        <section className="mt-5">
          <h4 className="font-bold">Observaciones</h4>
          <p className="mt-1 whitespace-pre-line text-sm text-stone-700">{intake.observations}</p>
        </section>
      )}

      <section className="mt-6 grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
        <div>
          {intake.customerSignature ? (
            // eslint-disable-next-line @next/next/no-img-element -- inline signature data URL
            <img src={intake.customerSignature} alt={`Firma de ${intake.deliveredByName}`} className="h-24 w-auto" />
          ) : (
            <p className="flex h-24 items-end text-sm text-stone-400">Sin firma</p>
          )}
          <p className="border-t border-stone-400 pt-1 text-sm font-bold">{intake.deliveredByName}</p>
          <p className="text-xs text-stone-500">Entrega el vehículo</p>
        </div>
        <div>
          {intake.receiverSignature ? (
            // eslint-disable-next-line @next/next/no-img-element -- inline signature data URL
            <img src={intake.receiverSignature} alt={`Firma de ${intake.receivedByName ?? "quien recibe"}`} className="h-24 w-auto" />
          ) : (
            <p className="flex h-24 items-end text-sm text-stone-400">Sin firma</p>
          )}
          <p className="border-t border-stone-400 pt-1 text-sm font-bold">{intake.receivedByName ?? "Taller"}</p>
          <p className="text-xs text-stone-500">Recibe por el taller</p>
        </div>
      </section>
    </>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="rounded-md bg-stone-100 p-3">
      <dt className="flex items-center gap-1.5 text-xs text-stone-500"><Icon size={14} /> {label}</dt>
      <dd className="mt-0.5 font-display text-xl font-bold">{value}</dd>
    </div>
  );
}

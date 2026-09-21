"use client";

import {
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Radio,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { formatAppointmentDateTime } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/client";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/domain";

type Appointment = {
  id: string;
  vehicle: string;
  status: OrderStatus;
  appointmentDate: string;
  diagnosticCount: number;
  budgetTotal: number | null;
  budgetApproved: boolean | null;
};

const progressStatuses: OrderStatus[] = [
  "por_ingresar",
  "ingresado",
  "diagnosticado",
  "presupuestado",
  "en_reparacion",
  "listo_para_entregar",
  "entregado",
];
const currency = new Intl.NumberFormat("es-VE", {
  style: "currency",
  currency: "USD",
});

export function ClientAppointmentsList({
  garageId,
  appointments,
}: {
  garageId: string;
  appointments: Appointment[];
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`client-appointments-${garageId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `garage_id=eq.${garageId}`,
        },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [garageId, router]);

  return (
    <section className="border-b border-stone-200 pb-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-700">
            <Radio size={15} /> Estados en vivo
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold">
            Mis citas en {appointments.length ? "este taller" : "el taller"}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Consulta el avance de cada vehículo desde la cita hasta la entrega.
          </p>
        </div>
        <span className="rounded-md bg-stone-900 px-3 py-2 text-sm font-bold text-white">
          {appointments.length}
        </span>
      </div>
      <div className="mt-4 grid gap-4">
        {appointments.map((appointment) => (
          <AppointmentCard key={appointment.id} appointment={appointment} />
        ))}
        {!appointments.length && (
          <p className="rounded-lg border border-stone-200 bg-white p-6 text-stone-600">
            Todavía no tienes citas asociadas a este taller.
          </p>
        )}
      </div>
    </section>
  );
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const rejected = appointment.status === "presupuesto_rechazado";
  const activeIndex = rejected
    ? 3
    : progressStatuses.indexOf(appointment.status);
  return (
    <article className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <header className="grid gap-4 border-b border-stone-200 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          <p className="text-xs font-bold uppercase text-[#d9341d]">
            Orden {appointment.id.slice(0, 8).toUpperCase()}
          </p>
          <h3 className="mt-1 text-lg font-bold">{appointment.vehicle}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-stone-600">
            <CalendarClock size={17} />{" "}
            {formatAppointmentDateTime(appointment.appointmentDate, "long")}
          </p>
        </div>
        <span
          className={`w-fit rounded-md px-3 py-2 text-sm font-bold ${rejected ? "bg-red-100 text-red-800" : "bg-stone-900 text-white"}`}
        >
          {ORDER_STATUS_LABELS[appointment.status]}
        </span>
      </header>
      <div className="p-5">
        <div
          className="grid grid-cols-7 gap-1"
          aria-label={`Progreso: ${ORDER_STATUS_LABELS[appointment.status]}`}
        >
          {progressStatuses.map((status, index) => (
            <div key={status} className="min-w-0">
              <span
                className={`block h-2 rounded-sm ${index <= activeIndex ? (rejected && index === activeIndex ? "bg-red-500" : "bg-emerald-500") : "bg-stone-200"}`}
              />
              <span className="mt-2 hidden text-[10px] font-semibold leading-3 text-stone-500 lg:block">
                {ORDER_STATUS_LABELS[status]}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-md bg-stone-50 p-3">
            <ClipboardList className="text-stone-400" size={19} />
            <div>
              <p className="text-xs text-stone-500">Hallazgos</p>
              <p className="font-bold">{appointment.diagnosticCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md bg-stone-50 p-3">
            <Wrench className="text-stone-400" size={19} />
            <div>
              <p className="text-xs text-stone-500">Presupuesto</p>
              <p className="font-bold">
                {appointment.budgetTotal === null
                  ? "Pendiente"
                  : currency.format(appointment.budgetTotal)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md bg-stone-50 p-3">
            <CircleCheck className="text-stone-400" size={19} />
            <div>
              <p className="text-xs text-stone-500">Decisión</p>
              <p className="font-bold">
                {appointment.budgetApproved === true
                  ? "Aceptado"
                  : appointment.budgetApproved === false
                    ? "Rechazado"
                    : appointment.budgetTotal === null
                      ? "Sin presupuesto"
                      : "Por decidir"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

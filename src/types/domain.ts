export const ORDER_STATUSES = [
  "por_ingresar",
  "ingresado",
  "diagnosticado",
  "presupuestado",
  "en_reparacion",
  "presupuesto_rechazado",
  "listo_para_entregar",
  "entregado",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type AppRole = "admin" | "garage_owner" | "mechanic" | "client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  por_ingresar: "Cita agendada",
  ingresado: "Vehículo ingresado",
  diagnosticado: "Diagnóstico listo",
  presupuestado: "Presupuesto publicado",
  en_reparacion: "En reparación",
  presupuesto_rechazado: "Presupuesto rechazado",
  listo_para_entregar: "Listo para entregar",
  entregado: "Vehículo entregado",
};

export type Diagnostic = {
  id: string;
  description: string;
  price: number | null;
  isCompleted: boolean;
};

export type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  plate: string;
};
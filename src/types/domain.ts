export const ORDER_STATUSES = [
  "por_ingresar",
  "ingresado",
  "diagnosticado",
  "presupuestado",
  "en_reparacion",
  "en_prueba",
  "presupuesto_rechazado",
  "listo_para_entregar",
  "entregado",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type AppRole = "admin" | "garage_owner" | "garage_manager" | "mechanic" | "client";

export type GarageStaffRole = "garage_owner" | "garage_manager";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  por_ingresar: "Cita agendada",
  ingresado: "Vehículo ingresado",
  diagnosticado: "Diagnóstico listo",
  presupuestado: "Presupuesto publicado",
  en_reparacion: "En reparación",
  en_prueba: "En prueba",
  presupuesto_rechazado: "Presupuesto rechazado",
  listo_para_entregar: "Listo para entregar",
  entregado: "Vehículo entregado",
};

export type Diagnostic = {
  id: string;
  description: string;
  price: number | null;
  isCompleted: boolean;
  component?: string | null;
  interventionType?: string | null;
  partBrand?: string | null;
};

export type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  plate: string;
};
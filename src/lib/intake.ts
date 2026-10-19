import { z } from "zod";

/** Default intake template: accessories checked when the vehicle arrives. */
export const DEFAULT_INTAKE_ACCESSORIES = [
  { key: "espejo_izquierdo", label: "Espejo izquierdo" },
  { key: "espejo_derecho", label: "Espejo derecho" },
  { key: "retrovisor", label: "Retrovisor" },
  { key: "alfombras", label: "Alfombras" },
  { key: "limpiaparabrisas", label: "Limpiaparabrisas" },
  { key: "corneta", label: "Corneta" },
  { key: "antena", label: "Antena" },
  { key: "reproductor", label: "Reproductor / radio" },
  { key: "tuerca_seguridad", label: "Tuerca de seguridad" },
  { key: "tapa_gasolina", label: "Tapa de gasolina" },
  { key: "gato", label: "Gato" },
  { key: "llave_cruz", label: "Llave de cruz" },
  { key: "cables_auxiliares", label: "Cables auxiliares" },
  { key: "copas_rines", label: "Copas de rines" },
  { key: "parabrisas", label: "Parabrisas" },
  { key: "vidrio_trasero", label: "Vidrio trasero" },
  { key: "vidrios_puertas", label: "Vidrios de puertas" },
  { key: "encendedor", label: "Encendedor" },
  { key: "faros", label: "Faros" },
  { key: "molduras", label: "Molduras" },
  { key: "stops", label: "Stops" },
  { key: "parrilla", label: "Parrilla" },
  { key: "caucho_repuesto", label: "Caucho de repuesto" },
  { key: "herramientas", label: "Herramientas" },
  { key: "extintor", label: "Extintor" },
  { key: "triangulo", label: "Triángulo de seguridad" },
  { key: "placa_delantera", label: "Placa delantera" },
  { key: "placa_trasera", label: "Placa trasera" },
] as const;

export const DAMAGE_TYPES = [
  { key: "rayon", label: "Rayón", color: "#f59e0b" },
  { key: "golpe", label: "Golpe", color: "#ef3f26" },
  { key: "abolladura", label: "Abolladura", color: "#8b5cf6" },
  { key: "roto", label: "Roto / quebrado", color: "#0f172a" },
  { key: "pintura", label: "Pintura dañada", color: "#0ea5e9" },
  { key: "faltante", label: "Pieza faltante", color: "#64748b" },
] as const;

export const CAR_VIEWS = [
  { key: "frontal", label: "Frontal" },
  { key: "trasera", label: "Trasera" },
  { key: "superior", label: "Superior" },
  { key: "izquierda", label: "Lateral izquierdo" },
  { key: "derecha", label: "Lateral derecho" },
] as const;

export type DamageTypeKey = (typeof DAMAGE_TYPES)[number]["key"];
export type CarViewKey = (typeof CAR_VIEWS)[number]["key"];

export const DAMAGE_TYPE_BY_KEY = new Map<string, (typeof DAMAGE_TYPES)[number]>(DAMAGE_TYPES.map((item) => [item.key, item]));

export const MAX_MILEAGE = 9_999_999;
export const MAX_INTAKE_PHOTOS = 12;
export const MAX_INTAKE_PHOTO_BYTES = 8 * 1024 * 1024;
export const INTAKE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const FUEL_LABELS = ["Reserva", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8", "Lleno"];

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => (value ? value : null));

export const intakeSchema = z.object({
  mileage: z.number().int().min(0).max(MAX_MILEAGE, "El kilometraje no puede superar 7 cifras."),
  fuelLevel: z.number().int().min(0).max(8),
  vin: optionalText(40),
  engineNumber: optionalText(40),
  hasRegistration: z.boolean(),
  hasInsurance: z.boolean(),
  accessories: z.array(z.object({ key: z.string().max(60), label: z.string().max(80), present: z.boolean() })).max(80),
  damages: z.array(z.object({
    id: z.string().max(40),
    view: z.enum(CAR_VIEWS.map((view) => view.key) as [CarViewKey, ...CarViewKey[]]),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    type: z.enum(DAMAGE_TYPES.map((type) => type.key) as [DamageTypeKey, ...DamageTypeKey[]]),
    note: z.string().trim().max(160).optional(),
  })).max(60),
  photos: z.array(z.object({ key: z.string().max(300), caption: z.string().trim().max(120).optional() })).max(MAX_INTAKE_PHOTOS),
  reportedIssue: z.string().trim().min(3, "Describe la falla que reporta el cliente.").max(1000),
  observations: optionalText(2000),
  deliveredByName: z.string().trim().min(2, "Indica quién entrega el vehículo.").max(120),
  customerSignature: z.string().startsWith("data:image/png;base64,").max(300_000).nullable(),
  receiverSignature: z.string().startsWith("data:image/png;base64,").max(300_000).nullable(),
});

export type IntakeInput = z.input<typeof intakeSchema>;
export type IntakeDamage = IntakeInput["damages"][number];

export type VehicleIntake = {
  id: string;
  mileage: number;
  fuelLevel: number;
  vin: string | null;
  engineNumber: string | null;
  hasRegistration: boolean;
  hasInsurance: boolean;
  accessories: { key: string; label: string; present: boolean }[];
  damages: IntakeDamage[];
  photos: { key: string; caption?: string; url?: string | null }[];
  reportedIssue: string;
  observations: string | null;
  deliveredByName: string;
  customerSignature: string | null;
  receiverSignature: string | null;
  receivedByName: string | null;
  createdAt: string;
};

export const INTAKE_COLUMNS =
  "id, order_id, mileage, fuel_level, vin, engine_number, has_registration, has_insurance, accessories, damages, photos, reported_issue, observations, delivered_by_name, customer_signature, receiver_signature, received_by, created_at";

type IntakeRow = {
  id: string;
  mileage: number;
  fuel_level: number;
  vin: string | null;
  engine_number: string | null;
  has_registration: boolean;
  has_insurance: boolean;
  accessories: VehicleIntake["accessories"];
  damages: IntakeDamage[];
  photos: VehicleIntake["photos"];
  reported_issue: string;
  observations: string | null;
  delivered_by_name: string;
  customer_signature: string | null;
  receiver_signature: string | null;
  created_at: string;
};

export function mapIntakeRow(row: IntakeRow, receivedByName: string | null = null): VehicleIntake {
  return {
    id: row.id,
    mileage: row.mileage,
    fuelLevel: row.fuel_level,
    vin: row.vin,
    engineNumber: row.engine_number,
    hasRegistration: row.has_registration,
    hasInsurance: row.has_insurance,
    accessories: row.accessories ?? [],
    damages: row.damages ?? [],
    photos: row.photos ?? [],
    reportedIssue: row.reported_issue,
    observations: row.observations,
    deliveredByName: row.delivered_by_name,
    customerSignature: row.customer_signature,
    receiverSignature: row.receiver_signature,
    receivedByName,
    createdAt: row.created_at,
  };
}

export function intakePhotoPrefix(garageId: string, orderId: string) {
  return `garages/${garageId}/orders/${orderId}/intake/`;
}

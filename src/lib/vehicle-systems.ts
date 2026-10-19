export type VehicleSystem = {
  key: string;
  label: string;
  components: { key: string; label: string }[];
};

/** Components grouped by system: the base of the vehicle's clinical history. */
export const VEHICLE_SYSTEMS: VehicleSystem[] = [
  {
    key: "enfriamiento",
    label: "Enfriamiento",
    components: [
      { key: "bomba_agua", label: "Bomba de agua" },
      { key: "termostato", label: "Termostato" },
      { key: "radiador", label: "Radiador" },
      { key: "electroventilador", label: "Electroventilador" },
      { key: "mangueras_refrigerante", label: "Mangueras de refrigerante" },
      { key: "tapa_radiador", label: "Tapa de radiador / envase" },
      { key: "refrigerante", label: "Refrigerante" },
      { key: "sensor_temperatura", label: "Sensor de temperatura (ECT)" },
    ],
  },
  {
    key: "combustible",
    label: "Combustible e inyección",
    components: [
      { key: "inyectores", label: "Inyectores" },
      { key: "bomba_gasolina", label: "Bomba / módulo de gasolina" },
      { key: "filtro_gasolina", label: "Filtro de gasolina" },
      { key: "regulador_presion", label: "Regulador de presión" },
      { key: "cuerpo_aceleracion", label: "Cuerpo de aceleración" },
      { key: "sensor_maf_map", label: "Sensor MAF / MAP" },
      { key: "sensor_oxigeno", label: "Sensor de oxígeno" },
    ],
  },
  {
    key: "encendido",
    label: "Encendido",
    components: [
      { key: "bujias", label: "Bujías" },
      { key: "bobinas", label: "Bobinas" },
      { key: "cables_bujia", label: "Cables de bujía" },
      { key: "sensor_ckp_cmp", label: "Sensor CKP / CMP" },
    ],
  },
  {
    key: "motor",
    label: "Motor",
    components: [
      { key: "aceite_filtro", label: "Aceite y filtro" },
      { key: "filtro_aire", label: "Filtro de aire" },
      { key: "correa_tiempo", label: "Correa / cadena de tiempo" },
      { key: "correa_accesorios", label: "Correa de accesorios" },
      { key: "empacadura_culata", label: "Empacadura de culata" },
      { key: "empacadura_valvulas", label: "Empacadura de tapa válvulas" },
      { key: "soportes_motor", label: "Soportes de motor" },
    ],
  },
  {
    key: "frenos",
    label: "Frenos",
    components: [
      { key: "pastillas", label: "Pastillas" },
      { key: "discos", label: "Discos" },
      { key: "bandas_tambores", label: "Bandas / tambores" },
      { key: "liquido_frenos", label: "Líquido de frenos" },
      { key: "calipers", label: "Calipers" },
      { key: "bomba_frenos", label: "Bomba de frenos" },
    ],
  },
  {
    key: "suspension",
    label: "Suspensión y dirección",
    components: [
      { key: "amortiguadores", label: "Amortiguadores" },
      { key: "bujes", label: "Bujes" },
      { key: "rotulas", label: "Rótulas" },
      { key: "terminales", label: "Terminales de dirección" },
      { key: "cremallera", label: "Cremallera / caja de dirección" },
      { key: "bomba_direccion", label: "Bomba de dirección" },
      { key: "rodamientos", label: "Rodamientos" },
    ],
  },
  {
    key: "transmision",
    label: "Transmisión",
    components: [
      { key: "aceite_caja", label: "Aceite de caja" },
      { key: "embrague", label: "Embrague (clutch)" },
      { key: "tripoides_crucetas", label: "Tripoides / crucetas" },
      { key: "caja", label: "Caja de velocidades" },
    ],
  },
  {
    key: "electrico",
    label: "Eléctrico",
    components: [
      { key: "bateria", label: "Batería" },
      { key: "alternador", label: "Alternador" },
      { key: "arranque", label: "Motor de arranque" },
      { key: "fusibles_reles", label: "Fusibles / relés" },
      { key: "luces", label: "Luces" },
    ],
  },
  {
    key: "aire_acondicionado",
    label: "Aire acondicionado",
    components: [
      { key: "compresor_ac", label: "Compresor" },
      { key: "gas_ac", label: "Carga de gas" },
      { key: "condensador_ac", label: "Condensador" },
    ],
  },
];

export const INTERVENTION_TYPES = ["reemplazo", "reparacion", "limpieza", "ajuste", "revision"] as const;
export type InterventionType = (typeof INTERVENTION_TYPES)[number];

export const INTERVENTION_LABELS: Record<InterventionType, string> = {
  reemplazo: "Reemplazo",
  reparacion: "Reparación",
  limpieza: "Limpieza",
  ajuste: "Ajuste",
  revision: "Revisión",
};

export const COMPONENTS = new Map(
  VEHICLE_SYSTEMS.flatMap((system) => system.components.map((component) => [component.key, { ...component, system }] as const)),
);

export const COMPONENT_KEYS = [...COMPONENTS.keys()] as [string, ...string[]];

export function componentLabel(key: string | null | undefined) {
  return key ? COMPONENTS.get(key)?.label ?? key : null;
}

export function interventionLabel(type: string | null | undefined) {
  return type && type in INTERVENTION_LABELS ? INTERVENTION_LABELS[type as InterventionType] : null;
}

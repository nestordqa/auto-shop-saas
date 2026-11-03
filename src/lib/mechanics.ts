export const MECHANIC_SPECIALTIES = [
  "tren_delantero_frenos",
  "electroauto",
  "mecanica_ligera",
  "motores",
  "transmisiones",
  "latoneria_pintura",
  "papel_ahumado",
  "car_audio",
  "alarmas",
  "general",
] as const;

export type MechanicSpecialty = typeof MECHANIC_SPECIALTIES[number];

export const MECHANIC_SPECIALTY_LABELS: Record<MechanicSpecialty, string> = {
  tren_delantero_frenos: "Tren delantero y frenos",
  electroauto: "Electroauto",
  mecanica_ligera: "Mecánica ligera",
  motores: "Motores",
  transmisiones: "Transmisiones",
  latoneria_pintura: "Latonería y pintura",
  papel_ahumado: "Papel ahumado",
  car_audio: "Car audio",
  alarmas: "Alarmas",
  general: "Mecánica general",
};
export type SpecialtyOption = { key: string; label: string };

/** Built-in list, used until migration 036 or when the table cannot be read. */
export const DEFAULT_SPECIALTY_OPTIONS: SpecialtyOption[] = MECHANIC_SPECIALTIES.map((key) => ({ key, label: MECHANIC_SPECIALTY_LABELS[key] }));

/** Label of a specialty key (admin-managed list first, then the built-in one). */
export function specialtyLabel(key: string, options: SpecialtyOption[] = DEFAULT_SPECIALTY_OPTIONS) {
  return options.find((option) => option.key === key)?.label ?? MECHANIC_SPECIALTY_LABELS[key as MechanicSpecialty] ?? key.charAt(0).toUpperCase() + key.slice(1).replaceAll("_", " ");
}

/** Readable list stored in `garages.specialty` (shown on the booking page and lists). */
export function specialtySummary(keys: readonly string[], options: SpecialtyOption[] = DEFAULT_SPECIALTY_OPTIONS) {
  const valid = options.filter((option) => keys.includes(option.key));
  return (valid.length ? valid : [{ key: "general", label: specialtyLabel("general", options) }]).map((option) => option.label).join(" · ");
}

/** Best-effort keys from a free-text specialty (prospects, older garages). */
export function specialtyKeysFrom(text: string | null | undefined, options: SpecialtyOption[] = DEFAULT_SPECIALTY_OPTIONS): string[] {
  if (!text) return ["general"];
  const found = options.filter((option) => text.toLowerCase().includes(option.label.toLowerCase())).map((option) => option.key);
  return found.length ? found : ["general"];
}

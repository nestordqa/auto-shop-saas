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
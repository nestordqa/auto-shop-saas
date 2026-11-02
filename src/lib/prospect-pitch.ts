/** Pitch sent to a prospect by WhatsApp: one template for garages in Mérida, one for the rest of the country. */
export type PitchKey = "prospect_pitch_local" | "prospect_pitch_remote";

export const PITCH_KEYS: PitchKey[] = ["prospect_pitch_local", "prospect_pitch_remote"];

export const PITCH_LABELS: Record<PitchKey, string> = {
  prospect_pitch_local: "Talleres en Mérida",
  prospect_pitch_remote: "Talleres fuera de Mérida",
};

export const pitchKeyFor = (isLocal: boolean): PitchKey => isLocal ? "prospect_pitch_local" : "prospect_pitch_remote";

/** Placeholders replaced when the message is prepared for one prospect. */
export const PITCH_PLACEHOLDERS = "{contacto} = nombre del contacto · {taller} = nombre del taller";

const SERVICES = [
  "TorkeOS es la plataforma para gestionar tu taller desde el teléfono:",
  "",
  "📅 Agenda online: tus clientes reservan su cita desde un enlace con el nombre de tu taller.",
  "🚗 Recepción digital del vehículo con fotos, kilometraje y firma.",
  "🔧 Órdenes de trabajo, diagnósticos y presupuestos que el cliente aprueba desde su celular.",
  "🔔 Notificaciones automáticas al cliente en cada paso: ingresado, en reparación, listo para retirar.",
  "👥 Tu equipo (mecánicos y encargados) con su propio acceso, y tus sucursales en un solo lugar.",
];

export const DEFAULT_PITCHES: Record<PitchKey, string> = {
  prospect_pitch_local: [
    "¡Hola {contacto}! Te saluda el equipo de TorkeOS, aquí en Mérida.",
    "",
    ...SERVICES,
    "",
    "Te invitamos a probarlo *gratis durante 30 días* en {taller}, sin compromiso. Como estamos cerca, podemos pasar por el taller, mostrártelo en persona y dejarlo configurado contigo en una visita corta.",
    "",
    "¿Qué día y hora te queda bien para visitarte?",
  ].join("\n"),
  prospect_pitch_remote: [
    "¡Hola {contacto}! Te saluda el equipo de TorkeOS.",
    "",
    ...SERVICES,
    "",
    "Te invitamos a probarlo *gratis durante 30 días* en {taller}, sin compromiso. Todo funciona en línea: te lo mostramos por videollamada en 15 minutos y dejamos tu taller listo a distancia, sin importar la ciudad.",
    "",
    "¿Cuándo te queda bien una videollamada?",
  ].join("\n"),
};

/** Fills the placeholders for one prospect. */
export function renderPitch(template: string, { contactName, garageName }: { contactName: string | null; garageName: string }) {
  return template.replaceAll("{contacto}", contactName ?? "").replaceAll("{taller}", garageName).replace("¡Hola !", "¡Hola!");
}

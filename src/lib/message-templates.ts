import { DEFAULT_PITCHES } from "@/lib/prospect-pitch";

/**
 * Every WhatsApp message TorkeOS prepares, editable by admins (Mensajes de WhatsApp).
 * A saved row in `admin_message_templates` overrides `body`; deleting it restores the default.
 * Placeholders like {taller} are filled when the message is prepared; one left empty disappears cleanly.
 */
export type TemplateKey =
  | "prospect_pitch_local" | "prospect_pitch_remote" | "prospect_requirements" | "prospect_follow_up"
  | "garage_created" | "garage_follow_up_local" | "garage_follow_up_remote" | "owner_welcome" | "contract_new" | "trial_follow_up"
  | "credentials" | "mechanic_welcome" | "client_welcome" | "order_status"
  | "landing_contact" | "support_request";

type TemplateDefinition = { group: string; label: string; description: string; placeholders: Record<string, string>; body: string };

const lines = (...rows: string[]) => rows.join("\n");

export const MESSAGE_TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  prospect_pitch_local: {
    group: "Prospectos",
    label: "Presentación · talleres en Mérida",
    description: "Botón «Presentar TorkeOS» de un prospecto de Mérida.",
    placeholders: { contacto: "Nombre del contacto", taller: "Nombre del taller" },
    body: DEFAULT_PITCHES.prospect_pitch_local,
  },
  prospect_pitch_remote: {
    group: "Prospectos",
    label: "Presentación · talleres fuera de Mérida",
    description: "Botón «Presentar TorkeOS» de un prospecto de fuera de Mérida.",
    placeholders: { contacto: "Nombre del contacto", taller: "Nombre del taller" },
    body: DEFAULT_PITCHES.prospect_pitch_remote,
  },
  prospect_requirements: {
    group: "Prospectos",
    label: "Requisitos para crear el taller",
    description: "Lista de datos que pedimos al prospecto, con la comparación de planes.",
    placeholders: { contacto: "Nombre del contacto (puede ir vacío)", planes: "Comparación de planes y precios (se genera sola)" },
    body: lines(
      "¡Hola {contacto}! Gracias por tu interés en TorkeOS.",
      "",
      "Para crear tu taller solo necesitamos estos datos:",
      "",
      "*Del taller*",
      "1. Nombre comercial",
      "2. Especialidad (opcional), por ejemplo: frenos y suspensión",
      "3. Dirección completa",
      "4. Ubicación en Google Maps (opcional)",
      "",
      "*Si el taller es de una empresa*",
      "• Razón social",
      "• RIF de la empresa",
      "",
      "*Del administrador de la cuenta*",
      "(la persona que manejará TorkeOS; si es una empresa, quien la represente)",
      "5. Nombre completo",
      "6. Cédula",
      "7. Correo electrónico (será su usuario para entrar)",
      "8. Teléfono",
      "",
      "*Elige tu plan*",
      "{planes}",
      "",
      "9. Indícanos qué plan prefieres (puedes cambiarlo más adelante).",
      "",
      "Con eso es suficiente. Una vez creado tu taller te enviaremos tu acceso y el contrato de tu *primer mes de prueba, sin costo*, con todas las funciones.",
    ),
  },
  prospect_follow_up: {
    group: "Prospectos",
    label: "Seguimiento",
    description: "Botón «Seguimiento» de un prospecto: ¿pudo ver la app?, ¿tiene dudas?",
    placeholders: { contacto: "Nombre del contacto", taller: "Nombre del taller" },
    body: lines(
      "¡Hola {contacto}! Te escribe el equipo de TorkeOS.",
      "",
      "Hace unos días te compartimos información sobre nuestra app para {taller} y queríamos saber si tuviste oportunidad de verla.",
      "",
      "¿Te quedó alguna duda o hay algo que quieras que te expliquemos? Con gusto te ayudamos por aquí.",
    ),
  },
  garage_follow_up_local: {
    group: "Talleres",
    label: "Seguimiento · talleres en Mérida",
    description: "Botón «Seguimiento» de la lista de talleres, si el taller está en Mérida (ofrece una cita presencial).",
    placeholders: { owner: "Nombre del administrador", taller: "Nombre del taller" },
    body: lines(
      "¡Hola {owner}! Te escribe el equipo de TorkeOS.",
      "",
      "Queríamos saber qué tal te ha parecido la experiencia con TorkeOS en {taller}. ¿Te ha resultado útil? ¿Tienes alguna duda o algo que mejorarías?",
      "",
      "Como estás aquí en Mérida, si quieres podemos agendar una visita a tu taller para explicarte todo el funcionamiento en persona, a ti y a tu equipo. Dinos qué día y hora te queda mejor.",
    ),
  },
  garage_follow_up_remote: {
    group: "Talleres",
    label: "Seguimiento · talleres fuera de Mérida",
    description: "Botón «Seguimiento» de la lista de talleres, si el taller está fuera de Mérida.",
    placeholders: { owner: "Nombre del administrador", taller: "Nombre del taller" },
    body: lines(
      "¡Hola {owner}! Te escribe el equipo de TorkeOS.",
      "",
      "Queríamos saber qué tal te ha parecido la experiencia con TorkeOS en {taller}. ¿Te ha resultado útil? ¿Tienes alguna duda o algo que mejorarías?",
      "",
      "Si quieres, podemos hacer una videollamada para explicarte todo el funcionamiento. Quedamos atentos.",
    ),
  },
  garage_created: {
    group: "Talleres",
    label: "Taller creado (enlace de reservas)",
    description: "Al crear un taller y en el botón de WhatsApp de la lista de talleres.",
    placeholders: { taller: "Nombre del taller", enlace: "Enlace de reservas del taller", acceso: "Bloque de acceso con correo y contraseña temporal (o cómo entrar, si el administrador ya existía)", contrato: "Bloque del contrato: tipo, vigencia y enlace para firmarlo (se genera solo)" },
    body: lines(
      "¡Hola! Tu taller {taller} ya está activo en TorkeOS.",
      "",
      "Comparte este enlace con tus clientes para que reserven sus citas: {enlace}",
      "",
      "{acceso}",
      "",
      "{contrato}",
    ),
  },
  owner_welcome: {
    group: "Talleres",
    label: "Bienvenida (todo listo)",
    description: "Contratos › «Mensaje de bienvenida»: enlaces y cómo instalar la app y activar notificaciones.",
    placeholders: { owner: "Nombre del administrador", taller: "Nombre del taller", panel: "Enlace para iniciar sesión", enlace: "Enlace de reservas del taller" },
    body: lines(
      "¡Hola {owner}! Todo listo ✅",
      "",
      "{taller} ya está activo en TorkeOS.",
      "",
      "*Tu panel:* {panel}",
      "Entra con tu correo y tu contraseña.",
      "",
      "*Enlace para tus clientes:* {enlace}",
      "Compártelo por WhatsApp, redes o en el taller: desde ahí se registran y agendan sus citas.",
      "",
      "*Importante: instala la app y activa las notificaciones*",
      "Al entrar por primera vez, TorkeOS te muestra paso a paso cómo instalar la app en tu teléfono (Android o iPhone) y luego cómo activar las notificaciones. Sin notificaciones no te llegarán avisos de citas nuevas, presupuestos aprobados ni pagos.",
      "",
      "*iPhone:* abre el enlace en Safari › Compartir › «Agregar a inicio», y abre TorkeOS desde el ícono nuevo.",
      "*Android:* abre el enlace en Chrome › menú ⋮ › «Instalar app».",
      "",
      "Tus clientes harán lo mismo al entrar con el enlace de tu taller. ¡Bienvenido a TorkeOS!",
    ),
  },
  contract_new: {
    group: "Talleres",
    label: "Nuevo contrato",
    description: "Contratos › compartir contrato (WhatsApp o correo).",
    placeholders: { owner: "Nombre del administrador", taller: "Nombre del taller", codigo: "Código del contrato (TK-0001)", condiciones: "Condiciones: prueba, plan y cobro (se generan solas)", enlace: "Enlace para leer y firmar el contrato" },
    body: lines(
      "Hola {owner},",
      "",
      "Tienes un nuevo contrato de TorkeOS para {taller} ({codigo}).",
      "{condiciones}",
      "",
      "Léelo y fírmalo desde tu teléfono aquí (inicia sesión con tu cuenta): {enlace}",
      "",
      "Cualquier duda, respóndenos por aquí.",
    ),
  },
  trial_follow_up: {
    group: "Talleres",
    label: "Seguimiento al terminar la prueba",
    description: "Contratos de prueba vencidos › «Enviar seguimiento».",
    placeholders: { owner: "Nombre del administrador", taller: "Nombre del taller", fin: "Fecha en que terminó la prueba", planes: "Comparación de planes y precios (se genera sola)" },
    body: lines(
      "Hola {owner},",
      "",
      "El mes de prueba de {taller} en TorkeOS terminó el {fin}. ¡Gracias por acompañarnos!",
      "",
      "Nos gustaría saber qué te pareció: qué te sirvió, qué mejorarías y si quieres seguir usando la plataforma.",
      "",
      "Si continúas, te enviamos tu contrato con el plan que prefieras:",
      "{planes}",
      "",
      "Quedamos atentos a tu respuesta.",
    ),
  },
  credentials: {
    group: "Accesos",
    label: "Bloque de acceso (contraseña temporal)",
    description: "Se inserta como {acceso} en «Taller creado» y «Bienvenida del mecánico».",
    placeholders: { panel: "Enlace para iniciar sesión", correo: "Correo del usuario", clave: "Contraseña temporal", recuperar: "Enlace de «¿Olvidaste tu contraseña?»" },
    body: lines(
      "Entra en {panel} con:",
      "• Correo: {correo}",
      "• Contraseña temporal: {clave}",
      "",
      "Esta contraseña es temporal. Puedes cambiarla de dos formas:",
      "• Inicia sesión y ve a Configuración › Contraseña.",
      "• O en la pantalla de inicio de sesión toca «¿Olvidaste tu contraseña?» ({recuperar}) y sigue el enlace que te llegará al correo.",
      "",
      "Al entrar por primera vez te mostraremos cómo instalar la app y activar las notificaciones.",
    ),
  },
  mechanic_welcome: {
    group: "Accesos",
    label: "Bienvenida del mecánico",
    description: "Equipo › al crear un mecánico (lo envía el administrador o encargado).",
    placeholders: { nombre: "Nombre del mecánico", acceso: "Bloque de acceso con correo y contraseña temporal" },
    body: lines(
      "¡Hola, {nombre}! Ya tienes tu cuenta de mecánico en TorkeOS.",
      "",
      "{acceso}",
    ),
  },
  client_welcome: {
    group: "Accesos",
    label: "Bienvenida del cliente",
    description: "Crear orden › cliente nuevo › «Enviar acceso por WhatsApp» (lo envía el taller).",
    placeholders: { nombre: "Nombre del cliente", taller: "Nombre del taller", enlace: "Enlace de reservas del taller", acceso: "Bloque de acceso con correo y contraseña temporal" },
    body: lines(
      "¡Hola, {nombre}! En {taller} te registramos en TorkeOS, la app donde podrás seguir el estado de tu vehículo, ver y aprobar presupuestos y agendar tus citas.",
      "",
      "{acceso}",
      "",
      "*Cómo empezar*",
      "1. Entra con los datos de arriba y cambia tu contraseña.",
      "2. Instala la app: en iPhone abre el enlace en Safari › Compartir › «Agregar a inicio»; en Android ábrelo en Chrome › menú ⋮ › «Instalar app».",
      "3. Activa las notificaciones para enterarte al momento de cada avance de tu orden.",
      "",
      "*Para agendar tus próximas citas con {taller}:* {enlace}",
    ),
  },
  order_status: {
    group: "Órdenes",
    label: "Estado de la orden al cliente",
    description: "Orden › «Enviar por WhatsApp» (lo envía el taller).",
    placeholders: { cliente: "Nombre del cliente", taller: "Nombre del taller", vehiculo: "Vehículo y placa", orden: "Número de orden", estado: "Estado actual", mensaje_estado: "Frase según el estado (se genera sola)", presupuesto: "Detalle del presupuesto, si aplica (se genera solo)" },
    body: lines(
      "Hola {cliente},",
      "",
      "Actualización de {taller}",
      "Vehículo: {vehiculo}",
      "Orden: {orden}",
      "Estado: {estado}",
      "",
      "{mensaje_estado}",
      "",
      "{presupuesto}",
    ),
  },
  landing_contact: {
    group: "Contacto con TorkeOS",
    label: "Contacto desde la página principal",
    description: "Botones «Hablar por WhatsApp» de la landing (los talleres nos escriben).",
    placeholders: {},
    body: "Hola, quiero TorkeOS para mi taller. ¿Me cuentan cómo empezar?",
  },
  support_request: {
    group: "Contacto con TorkeOS",
    label: "Solicitud de soporte",
    description: "Botón «Soporte» del panel (los usuarios nos escriben).",
    placeholders: { usuario: "Nombre del usuario", rol: "Rol y taller del usuario" },
    body: "Hola, necesito soporte con TorkeOS. Soy {usuario} ({rol}).",
  },
};

export const TEMPLATE_KEYS = Object.keys(MESSAGE_TEMPLATES) as TemplateKey[];
export const isTemplateKey = (key: string): key is TemplateKey => key in MESSAGE_TEMPLATES;

/** Fills {placeholders}; empty ones vanish without leaving "Hola !" or runs of blank lines. */
export function renderTemplate(body: string, values: Record<string, string | null | undefined>) {
  return body
    .replace(/\{([a-z_]+)\}/g, (match, name: string) => (name in values ? values[name] ?? "" : match))
    .replace(/[ \t]+([!?,.])/g, "$1")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

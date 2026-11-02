/** Bump it when the terms change: every user is asked to accept the new version on their next visit. */
export const TERMS_VERSION = "2026-11-02";

export function needsTermsAcceptance(profile: { terms_version: string | null } | null | undefined) {
  return profile?.terms_version !== TERMS_VERSION;
}

/** Terms and Conditions of TorkeOS, as titled sections. */
export const TERMS_SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Qué es TorkeOS",
    body: [
      "TorkeOS es una plataforma tecnológica que presta un servicio de software para que los talleres mecánicos gestionen citas, recepción de vehículos, diagnósticos, presupuestos, pagos y notificaciones, y para que sus clientes puedan seguir esos procesos.",
      "TorkeOS es únicamente una prestadora de servicios tecnológicos. No es un taller, no presta servicios mecánicos, no vende repuestos y no forma parte de la relación comercial entre el taller y su cliente.",
    ],
  },
  {
    title: "2. Exención de responsabilidad sobre reparaciones",
    body: [
      "Los diagnósticos, presupuestos, reparaciones, repuestos, tiempos de entrega y cualquier trabajo sobre el vehículo son responsabilidad exclusiva del taller que los realiza.",
      "TorkeOS no se hace responsable por garantías, reparaciones, fallas, daños, pérdidas o perjuicios ocasionados al vehículo, a sus ocupantes, a sus pertenencias o a terceros, antes, durante o después del servicio del taller.",
      "Cualquier reclamo sobre la calidad del trabajo, garantías, cobros o daños debe dirigirse directamente al taller correspondiente.",
    ],
  },
  {
    title: "3. Pagos",
    body: [
      "Los pagos de los clientes se realizan directamente al taller, mediante los métodos que el taller publica. TorkeOS no recibe, custodia ni procesa esos pagos y no responde por pagos no reconocidos, reembolsos o diferencias de monto; esas situaciones se resuelven entre el cliente y el taller.",
    ],
  },
  {
    title: "4. Cuentas y uso adecuado",
    body: [
      "Cada usuario es responsable de la veracidad de los datos que registra y de mantener la confidencialidad de su contraseña. Las acciones realizadas desde una cuenta se consideran hechas por su titular.",
      "Está prohibido usar la plataforma para fines ilícitos, suplantar a otras personas o intentar acceder a información ajena. TorkeOS puede suspender o desactivar cuentas que incumplan estos términos.",
    ],
  },
  {
    title: "5. Datos personales",
    body: [
      "TorkeOS trata los datos registrados (nombre, contacto, vehículos, órdenes y comprobantes) de forma confidencial y solo para prestar el servicio. El taller con el que el cliente agenda tiene acceso a los datos necesarios para atenderlo.",
    ],
  },
  {
    title: "6. Disponibilidad del servicio",
    body: [
      "TorkeOS procura que la plataforma esté disponible en todo momento, pero no garantiza un servicio ininterrumpido ni libre de errores, y no responde por pérdidas derivadas de interrupciones, fallas de conexión o de terceros proveedores.",
    ],
  },
  {
    title: "7. Cambios en los términos",
    body: [
      "TorkeOS puede actualizar estos términos. Cuando ocurra, se solicitará aceptar la nueva versión para seguir usando la plataforma.",
    ],
  },
];

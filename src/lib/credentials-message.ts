/** Login lines for WhatsApp welcome messages: email, temporary password and how to replace it. */
export function credentialLines({ origin, email, password }: { origin: string; email: string; password: string }) {
  return [
    `Entra en ${origin}/login con:`,
    `• Correo: ${email}`,
    `• Contraseña temporal: ${password}`,
    "",
    "Esta contraseña es temporal. Puedes cambiarla de dos formas:",
    "• Inicia sesión y ve a Configuración › Contraseña.",
    `• O en la pantalla de inicio de sesión toca «¿Olvidaste tu contraseña?» (${origin}/forgot-password) y sigue el enlace que te llegará al correo.`,
    "",
    "Al entrar por primera vez te mostraremos cómo instalar la app y activar las notificaciones.",
  ];
}

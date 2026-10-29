# TorkeOS

PWA SaaS multitenant para talleres mecánicos, construida con Next.js 16, TypeScript, Tailwind CSS 4 y Supabase.

## Inicio local

```bash
npm install
copy .env.example .env.local
npm run dev
```

Sin variables de Supabase, la aplicación entra en modo demostración. Rutas disponibles:

- `/dashboard/client`: inicio del cliente (presupuestos por decidir y servicios en curso), más `/dashboard/client/vehicles` y `/dashboard/client/appointments`.
- `/dashboard/mechanic`: diagnóstico progresivo sin precios.
- `/dashboard/owner`: tarifación, presupuesto y WhatsApp (owner y encargado).
- `/dashboard/admin`: visión global de talleres.

## Roles

| Rol | `app_metadata.role` | Alcance |
| --- | --- | --- |
| Admin | `admin` | Red completa de talleres, catálogo y facturación global. |
| Owner | `garage_owner` | Su taller completo, incluida la facturación y los encargados. |
| Encargado | `garage_manager` | Opera el taller como el owner (órdenes, agenda, ingreso, presupuestos, mecánicos), sin facturación ni gestión de encargados. Tabla `garage_managers`. |
| Mecánico | `mechanic` | Solo órdenes asignadas: formato de ingreso y diagnóstico, sin precios. |
| Cliente | `client` | Sus vehículos, citas, presupuestos e historial. |

## Supabase

1. Crea un proyecto y completa `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`.
2. Ejecuta en orden las migraciones de `supabase/migrations/` mediante Supabase CLI o SQL Editor. La `008` agrega un valor al enum `app_role` y debe ejecutarse **sola, antes** de la `009`. La `010` crea el bucket privado `intake-photos` de Supabase Storage. La `016` crea `order_status_history` (ver «Seguimiento de estados»). La `017` agrega el estado `en_prueba` y, como la `008`, debe ejecutarse **sola, antes** de la `018`, que permite `en_reparacion ⇄ en_prueba` y `en_prueba → listo_para_entregar`, también al mecánico asignado.
3. Crea el primer admin con Admin API y `app_metadata.role = "admin"`.
4. Crea owners, encargados y mechanics desde una función de servidor confiable usando Admin API. Nunca expongas `SUPABASE_SECRET_KEY` al navegador ni uses el prefijo `NEXT_PUBLIC_` para esa variable.

## Formato de ingreso e historia clínica

- `vehicle_intakes`: un formato por orden (kilometraje, combustible, documentos, accesorios, daños sobre el diagrama, fotos, falla reportada y firma). El trigger `validate_order_transition` impide pasar a `ingresado` sin formato.
- `diagnostics.component`, `intervention_type` y `part_brand` alimentan la historia clínica (`src/lib/vehicle-history.ts`) y la página de durabilidad (`/dashboard/owner/insights`). El catálogo de sistemas y componentes vive en `src/lib/vehicle-systems.ts`; la plantilla de accesorios en `src/lib/intake.ts`.

### PDF del formato de ingreso

`/print/intake/[intakeId]` es una página fuera del dashboard con solo el documento de ingreso: logo, cliente, taller e `IntakeDocument` (`src/components/intake/intake-summary.tsx`). Al cargar abre el diálogo de impresión del navegador (`PrintButton`); `@page { margin: 0 }` evita que salgan la fecha y la URL, y el título de la página es el nombre del archivo. No se genera en el servidor porque las fotos pueden ser WebP. La página verifica en el servidor que quien la abre sea admin, owner o encargado del taller de la orden, o el cliente dueño del vehículo. El mecánico no tiene el enlace (`downloadable={false}`).

### Fotos en Supabase Storage

Las fotos viven en el bucket privado `intake-photos` (migración `010`). El servidor, con `SUPABASE_SECRET_KEY`, firma una URL de subida por foto y URLs de lectura de 1 hora (`src/lib/storage/intake-photos.ts`); el navegador nunca tiene acceso directo al bucket y no hacen falta políticas en `storage.objects`. Límite: 8 MB por foto, JPG/PNG/WebP.

El rol del trigger se obtiene de `raw_app_meta_data`, que solo debe escribir un backend privilegiado. El registro público siempre cae en `client`. RLS aísla datos por taller y los triggers bloquean cambios de rol, precios por mecánicos, totales manuales y transiciones inválidas.

## Seguimiento de estados

`order_status_history` (migración `016`) guarda cada estado de una orden con su fecha. Lo llena el trigger `orders_log_status` en cada alta y cambio de estado. La migración rellena las órdenes existentes con `created_at`, `received_at`, `updated_at` y `delivered_at`, así que los pasos intermedios anteriores a ella tienen fechas aproximadas. RLS: lo leen admin, el taller de la orden y el cliente dueño del vehículo. El portal del cliente carga sus datos en `src/lib/client-portal.ts` y los muestra con `OrderTimeline` (`src/components/client/client-portal.tsx`).

## PWA

- `src/app/manifest.ts`: `start_url` es `/dashboard`, que redirige al panel del rol o a `/login` (`src/lib/auth/role-routes.ts`). `/login` también salta al panel si ya hay sesión.
- `public/sw.js`: service worker solo de red. **No cachea páginas autenticadas**; sin conexión sirve `public/offline.html`. Se registra solo en producción (`src/components/pwa/service-worker-register.tsx`), así que para probar la instalación usa `npm run build && npm start`.
- `/login` muestra `InstallAppButton`: el diálogo nativo en Android/Chrome/Edge y una instrucción en iOS (Compartir → Agregar a inicio).
- La sesión persiste con las cookies de `@supabase/ssr`, renovadas por `src/proxy.ts`. Solo expira si se configura un límite en Supabase Auth → Sessions.

## Estructura

```text
src/
  app/
    dashboard/
      admin/       # layout protegido: admin
      owner/       # layout protegido: garage_owner y garage_manager
      mechanic/    # layout protegido: mechanic
      client/      # layout protegido: client
    login/
    print/          # documentos imprimibles (PDF del ingreso)
    manifest.ts
  components/
    auth/
    client/         # portal del cliente
    intake/         # formato de ingreso y su documento
    dashboard/
    layout/
    orders/
    pwa/            # service worker e instalación
  lib/
    auth/           # autorización server-side
    supabase/       # clientes browser/server y sesión Proxy
    whatsapp.ts
  types/
supabase/
  migrations/
```

Los layouts son una barrera de navegación, no la única defensa. Toda mutación futura debe volver a verificar sesión y rol en su Server Action; PostgreSQL RLS conserva la barrera final.

## Calidad

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Usuarios de prueba

Las credenciales de prueba no se versionan. Pídelas al equipo o créalas en tu proyecto de Supabase local.

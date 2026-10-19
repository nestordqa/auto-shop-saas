# TorkeOS

PWA SaaS multitenant para talleres mecánicos, construida con Next.js 16, TypeScript, Tailwind CSS 4 y Supabase.

## Inicio local

```bash
npm install
copy .env.example .env.local
npm run dev
```

Sin variables de Supabase, la aplicación entra en modo demostración. Rutas disponibles:

- `/dashboard/client`: seguimiento y presupuesto del cliente.
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
2. Ejecuta en orden las migraciones de `supabase/migrations/` mediante Supabase CLI o SQL Editor. La `008` agrega un valor al enum `app_role` y debe ejecutarse **sola, antes** de la `009`. La `010` crea el bucket privado `intake-photos` de Supabase Storage.
3. Crea el primer admin con Admin API y `app_metadata.role = "admin"`.
4. Crea owners, encargados y mechanics desde una función de servidor confiable usando Admin API. Nunca expongas `SUPABASE_SECRET_KEY` al navegador ni uses el prefijo `NEXT_PUBLIC_` para esa variable.

## Formato de ingreso e historia clínica

- `vehicle_intakes`: un formato por orden (kilometraje, combustible, documentos, accesorios, daños sobre el diagrama, fotos, falla reportada y firma). El trigger `validate_order_transition` impide pasar a `ingresado` sin formato.
- `diagnostics.component`, `intervention_type` y `part_brand` alimentan la historia clínica (`src/lib/vehicle-history.ts`) y la página de durabilidad (`/dashboard/owner/insights`). El catálogo de sistemas y componentes vive en `src/lib/vehicle-systems.ts`; la plantilla de accesorios en `src/lib/intake.ts`.

### Fotos en Supabase Storage

Las fotos viven en el bucket privado `intake-photos` (migración `010`). El servidor, con `SUPABASE_SECRET_KEY`, firma una URL de subida por foto y URLs de lectura de 1 hora (`src/lib/storage/intake-photos.ts`); el navegador nunca tiene acceso directo al bucket y no hacen falta políticas en `storage.objects`. Límite: 8 MB por foto, JPG/PNG/WebP.

El rol del trigger se obtiene de `raw_app_meta_data`, que solo debe escribir un backend privilegiado. El registro público siempre cae en `client`. RLS aísla datos por taller y los triggers bloquean cambios de rol, precios por mecánicos, totales manuales y transiciones inválidas.

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
    manifest.ts
  components/
    auth/
    dashboard/
    layout/
    orders/
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


##USERS

-- ndqa96@gmail.com Valen1501* ADMIN
-- pruebita@gmail.com Prueba123456* OWNER
-- tren@gmail.com Tren123456* MECHANIC
-- prueba_cliente@gmail.com Prueba123456*


TALLER ALEGRIA:
ADMIN: ndqa96@gmail.com Valen1501*
DUEÑO DE TALLER: taller-alegria@gmail.com Taller123456*
ENCARGADO: encargado-taller-alegria@gmail.com encargado123456*
MECANICO TALLER: mecanico1@gmail.com Mecanico123456*
CLIENTE TALLER cliente-taller@gmail.com Cliente123456*

tallercito@gmail.com
Tallercito123456*


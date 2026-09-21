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
- `/dashboard/owner`: tarifación, presupuesto y WhatsApp.
- `/dashboard/admin`: visión global de talleres.

## Supabase

1. Crea un proyecto y completa `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`.
2. Ejecuta en orden las migraciones de `supabase/migrations/` mediante Supabase CLI o SQL Editor.
3. Crea el primer admin con Admin API y `app_metadata.role = "admin"`.
4. Crea owners y mechanics desde una función de servidor confiable usando Admin API. Nunca expongas `SUPABASE_SECRET_KEY` al navegador ni uses el prefijo `NEXT_PUBLIC_` para esa variable.

El rol del trigger se obtiene de `raw_app_meta_data`, que solo debe escribir un backend privilegiado. El registro público siempre cae en `client`. RLS aísla datos por taller y los triggers bloquean cambios de rol, precios por mecánicos, totales manuales y transiciones inválidas.

## Estructura

```text
src/
  app/
    dashboard/
      admin/       # layout protegido: admin
      owner/       # layout protegido: garage_owner
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
MECANICO TALLER: mecanico1@gmail.com Mecanico123456*
CLIENTE TALLER cliente-taller@gmail.com Cliente123456*



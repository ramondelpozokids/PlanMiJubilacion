# Supabase — proyecto nuevo (recomendado)

PlanMiJubilacion debe usar **su propio proyecto Supabase**, separado de CourtManager Pro.

## 1. Crear proyecto (5 min)

1. Entra en [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → nombre: `planmijubilacion`
3. Región: **West EU (Frankfurt)** o la más cercana
4. Guarda la contraseña de la base de datos

## 2. Ejecutar migraciones SQL

En **SQL Editor** → **New query**, pega y ejecuta en orden:

1. `migrations/001_init.sql` — tablas, RLS, triggers
2. `migrations/002_storage.sql` — bucket `documents`
3. `migrations/003_documents_update_policy.sql` — **permite actualizar estado OCR** (sin esto quedan en "processing")
4. `migrations/004_expediente.sql` — tabla **expedientes** (expediente digital unificado)

## 3. Auth — crear tus usuarios admin

En **Authentication → Users → Add user**:

| Email | Contraseña | Notas |
|-------|------------|-------|
| `info@ramondelpozorott.es` | (la que elijas) | Admin ilimitado |
| `ramon55555@gmail.com` | (la que elijas) | Admin ilimitado |

Opcional: activa **Google** y **Apple** en Authentication → Providers.

## 4. Copiar claves a `.env.local`

**Project Settings → API**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...   # anon / public
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...       # service_role (solo servidor)
```

## 5. Arrancar

```bash
npm run dev
```

Inicia sesión con `info@ramondelpozorott.es` o `ramon55555@gmail.com`.

En **Ajustes** verás **Fundador · Acceso ilimitado**.

## Admins configurados en código

- `info@ramondelpozorott.es`
- `ramon55555@gmail.com`

Definidos en `lib/admin/config.ts` — premium gratis, sin límites, sin Stripe.

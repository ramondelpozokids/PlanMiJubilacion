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
5. `migrations/005_documents_queue.sql` — cola OCR e idempotencia por hash
6. `migrations/006_consultation_cases.sql` — **asesoría fundador** (consultas de terceros)
7. `migrations/007_consultation_life_path.sql` — escenario vital por consulta (si ya ejecutaste 006 antes)
8. `migrations/008_billing_international.sql` — precios configurables, pedidos y facturas/recibos
9. `migrations/009_billing_issue_policies.sql` — emisión de documentos + numeración FAC/REC/INF
10. `migrations/010_contact_submissions.sql` — formulario de contacto + bucket cifrado
11. `migrations/011_consultation_birth_date.sql` — fecha de nacimiento en consultas de terceros

### Comprobación rápida (estado típico producción)

| Pieza | Tabla / recurso |
|-------|-----------------|
| Core | `profiles`, `documents`, `expedientes` |
| Asesoría | `consultation_cases` (+ `life_path`) |
| Contacto | `contact_submissions`, bucket `contact-encrypted` |
| Facturación | `pricing_rules`, `service_orders`, `billing_documents` |
| Pendiente frecuente | columna `client_birth_date` → ejecuta `MANUAL_011.sql` |

1. Añade en `.env.local` la contraseña de la base de datos:

```env
SUPABASE_DB_PASSWORD=tu_password_de_supabase
```

(La encuentras en **Project Settings → Database → Database password**.)

2. Aplica todas las migraciones pendientes:

```bash
npm run db:push
```

Esto sube `supabase/migrations/*.sql` al proyecto remoto (incluida la **007** con `life_path`).

### Opción B — SQL Editor manual

Si prefieres pegar SQL a mano, ejecuta solo las migraciones que aún no tengas (p. ej. `007_consultation_life_path.sql` si ya corriste la 006).

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

# PlanMiJubilacion

> Asistente inteligente para planificar tu jubilación en España.

## Stack

- **Framework:** Next.js 14 + TypeScript
- **Auth & DB:** Supabase
- **IA:** OpenAI + Google Document AI
- **Pagos:** Stripe
- **Analytics:** PostHog
- **Monitorización:** Sentry

## Estructura

```
planmijubilacion/
├── app/                  # App Router (páginas y APIs)
├── components/           # UI y features
├── lib/                  # Lógica de negocio, Supabase, IA, admin
├── public/               # Estáticos (robots, sitemap)
├── supabase/             # Migraciones SQL
└── ...
```

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local
# Configura Supabase, OpenAI, etc. en .env.local
npm run dev
```

Abre http://localhost:3000

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación TypeScript |
| `npm run db:types` | Generar tipos Supabase |

## Admin / fundador

Acceso ilimitado y gratuito para:

- `info@ramondelpozorott.es`
- `ramon55555@gmail.com`

Configurado en `lib/admin/config.ts`.

## Supabase (primera vez)

Sigue **`supabase/SETUP.md`** para crear un proyecto nuevo y ejecutar las migraciones.

## Disclaimer

Las simulaciones son orientativas. No sustituyen el cálculo oficial de la Seguridad Social.

## Contacto

- General: hola@planmijubilacion.es
- Privacidad: privacidad@planmijubilacion.es
- Legal: legal@planmijubilacion.es

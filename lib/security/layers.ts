/**
 * Capas de seguridad PlanMiJubilación (datos personales / expediente).
 *
 * 1) Transporte + cabeceras del navegador (HTTPS, HSTS, CSP, no-store en privado)
 * 2) Autenticación (Supabase Auth + middleware de rutas protegidas)
 * 3) Autorización y aislamiento de datos (perfil/admin + RLS en Supabase)
 */
export const SECURITY_LAYERS = [
  {
    id: 1,
    title: 'Capa 1 · Transporte y navegador',
    summary:
      'HTTPS + HSTS, Content-Security-Policy, X-Frame-Options DENY, noindex/no-store en rutas privadas.',
    checks: [
      'Strict-Transport-Security (preload)',
      'CSP con frame-ancestors none',
      'Cache-Control private/no-store en expediente',
      'X-Robots-Tag noindex en rutas privadas',
    ],
  },
  {
    id: 2,
    title: 'Capa 2 · Autenticación',
    summary:
      'Sesión Supabase obligatoria para dashboard, documentos, jubilación, asesoría y APIs sensibles.',
    checks: [
      'middleware.ts redirige a /login sin sesión',
      'Cookies de sesión HttpOnly vía @supabase/ssr',
      'Rutas /api protegidas por getUser/getProfile',
    ],
  },
  {
    id: 3,
    title: 'Capa 3 · Autorización y datos',
    summary:
      'Cada usuario solo ve su expediente; fundador acotado por email; RLS en tablas Supabase.',
    checks: [
      'Row Level Security (RLS) en documents / expedientes',
      'Consultas de terceros solo con hasUnlimitedAccess',
      'Adjuntos de contacto cifrados (AES-GCM) en tránsito al buzón',
      'Rate limit en APIs sensibles (chat / process / decrypt)',
    ],
  },
] as const;

export type SecurityLayer = (typeof SECURITY_LAYERS)[number];

/**
 * URL canónica del sitio (SEO, sitemap, robots, OG).
 * En Vercel: NEXT_PUBLIC_APP_URL = https://tu-proyecto.vercel.app
 * En producción con dominio: https://planmijubilacion.es
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) return fromEnv;
  return 'https://planmijubilacion.es';
}

/** Rutas autenticadas: nunca indexar ni listar en sitemap. */
export const PRIVATE_PATH_PREFIXES = [
  '/dashboard',
  '/upload',
  '/analysis',
  '/miop',
  '/comparator',
  '/calendar',
  '/settings',
  '/jubilacion',
  '/prestaciones',
  '/vida-laboral',
  '/futuro',
  '/asesoria',
  '/revision-internacional',
  '/informes',
  '/api',
  '/login',
] as const;

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

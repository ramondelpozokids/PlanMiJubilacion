/** Administradores con acceso ilimitado. */
export const ADMINS = [
  { email: 'ramon55555@gmail.com' },
  { email: 'info@ramondelpozorott.es' },
] as const;

export const FOUNDER = ADMINS[0];

/** Nombre canónico del fundador (nunca el de un familiar del OCR). */
export const FOUNDER_DISPLAY_NAME = 'Ramón del Pozo Rott';

export const ADMIN_EMAILS: readonly string[] = ADMINS.map((a) => a.email.toLowerCase());

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function getAdminProfile(email: string | null | undefined) {
  if (!email) return null;
  return ADMINS.find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null;
}

/** Nombre a mostrar en UI: fundador siempre Ramón; resto perfil o fallback. */
export function resolveDisplayName(opts: {
  email?: string | null;
  fullName?: string | null;
  fallback?: string;
}): string {
  if (isAdminEmail(opts.email)) return FOUNDER_DISPLAY_NAME;
  const name = opts.fullName?.trim();
  if (name) return name;
  return opts.fallback ?? 'usuario';
}

/** Administradores con acceso ilimitado. Sin datos personales: el perfil se rellena del PDF o Ajustes. */
export const ADMINS = [
  { email: 'ramon55555@gmail.com' },
  { email: 'info@ramondelpozorott.es' },
] as const;

export const FOUNDER = ADMINS[0];

export const ADMIN_EMAILS: readonly string[] = ADMINS.map((a) => a.email.toLowerCase());

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function getAdminProfile(email: string | null | undefined) {
  if (!email) return null;
  return ADMINS.find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null;
}

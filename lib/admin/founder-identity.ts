/**
 * Identidad canónica del fundador en Mi plan (nunca datos OCR de un familiar).
 * Carlos y otros van a Amigos y familiares → Consultas.
 */
import type { ExpedienteDigital, SourcedValue } from '@/lib/expediente/types';
import { FOUNDER_DISPLAY_NAME, isAdminEmail } from '@/lib/admin/config';

export const FOUNDER_IDENTITY = {
  nombre: FOUNDER_DISPLAY_NAME,
  dni: '07534307J',
  /** DD/MM/YYYY — jubilación ordinaria a los 65 → 02/08/2032 */
  fechaNacimiento: '02/08/1967',
  naf: '280406289544',
} as const;

const FOUNDER_SOURCE = {
  documentId: 'founder-identity',
  documentName: 'Identidad fundador (Mi plan)',
  documentType: 'otro' as const,
  extractedAt: new Date(0).toISOString(),
  confidence: 1,
};

function sourced<T>(value: T): SourcedValue<T> {
  return { value, sources: [FOUNDER_SOURCE] };
}

export function isForeignIdentityName(nombre: string | null | undefined): boolean {
  if (!nombre?.trim()) return false;
  const n = nombre.toLowerCase();
  if (/ram[oó]n/.test(n) && /del\s*pozo/.test(n)) return false;
  // Familiar / terceros conocidos mezclados por error en Mi plan
  if (/carlos/.test(n)) return true;
  return !/ram[oó]n/.test(n);
}

/** Fuerza identificación de Ramón en el expediente personal del fundador. */
export function applyFounderIdentity(exp: ExpedienteDigital): boolean {
  const before = JSON.stringify({
    n: exp.identificacion.nombre?.value,
    d: exp.identificacion.dni?.value,
    f: exp.identificacion.fechaNacimiento?.value,
    a: exp.identificacion.numeroAfiliacion?.value,
  });

  exp.identificacion.nombre = sourced(FOUNDER_IDENTITY.nombre);
  exp.identificacion.dni = sourced(FOUNDER_IDENTITY.dni);
  exp.identificacion.nie = null;
  exp.identificacion.fechaNacimiento = sourced(FOUNDER_IDENTITY.fechaNacimiento);
  exp.identificacion.numeroAfiliacion = sourced(FOUNDER_IDENTITY.naf);

  const birth = new Date(1967, 7, 2);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  exp.identificacion.edad = sourced(age);

  const after = JSON.stringify({
    n: exp.identificacion.nombre?.value,
    d: exp.identificacion.dni?.value,
    f: exp.identificacion.fechaNacimiento?.value,
    a: exp.identificacion.numeroAfiliacion?.value,
  });
  return before !== after;
}

export function shouldLockFounderIdentity(email: string | null | undefined): boolean {
  return isAdminEmail(email);
}

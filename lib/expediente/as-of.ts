/**
 * Fecha de referencia del expediente = fecha del informe VL, o hoy.
 * Cotización en meses equivalentes (incluye días restantes / días computables).
 */
import type { ExpedienteDigital } from './types';
import { parseDmy } from './sanitize';
import type { Ymd } from '@/lib/calculator/career-ymd';

/** Rellena campos nuevos en expedientes guardados antes de este cambio. */
export function ensureResumenExactDates(expediente: ExpedienteDigital): void {
  const r = expediente.resumen as ExpedienteDigital['resumen'] & {
    diasRestantes?: ExpedienteDigital['resumen']['diasRestantes'];
    fechaInforme?: ExpedienteDigital['resumen']['fechaInforme'];
  };
  if (r.diasRestantes === undefined) r.diasRestantes = null;
  if (r.fechaInforme === undefined) r.fechaInforme = null;
  if (r.diasAltaTotal === undefined) r.diasAltaTotal = null;
  if (r.diasPluriempleo === undefined) r.diasPluriempleo = null;
}

/** “Hoy” del expediente: fecha del informe de vida laboral si existe. */
export function resolveExpedienteAsOf(
  expediente: ExpedienteDigital,
  fallback: Date = new Date()
): Date {
  ensureResumenExactDates(expediente);
  const raw = expediente.resumen.fechaInforme?.value;
  const d = typeof raw === 'string' ? parseDmy(raw) : null;
  return d ?? fallback;
}

/**
 * Carrera computable a precisión día (del bloque TGSS).
 * Preferencia: años/meses/días del resumen; si faltan, deriva de totalDiasCotizacion.
 */
export function contributionYmdFromExpediente(expediente: ExpedienteDigital): Ymd {
  ensureResumenExactDates(expediente);
  const years = Number(expediente.resumen.anosCotizados?.value ?? 0);
  const months = Number(expediente.resumen.mesesCotizados?.value ?? 0);
  const days = Number(expediente.resumen.diasRestantes?.value ?? 0);
  if (years > 0 || months > 0 || days > 0) {
    return { years, months, days };
  }
  const total = Number(expediente.resumen.totalDiasCotizacion?.value ?? 0);
  if (total <= 0) return { years: 0, months: 0, days: 0 };
  const y = Math.floor(total / 365.25);
  const rem = total - y * 365.25;
  const m = Math.floor(rem / 30.4375);
  const d = Math.max(0, Math.round(rem - m * 30.4375));
  return { years: y, months: m, days: d };
}

/**
 * Meses cotizados para reglas SS / jubilación.
 * Preferencia: días computables del informe → meses equivalentes.
 * Si no hay días: años + meses + fracción de días restantes.
 */
export function contributionMonthsFromExpediente(expediente: ExpedienteDigital): number {
  const dias = expediente.resumen.totalDiasCotizacion?.value;
  if (typeof dias === 'number' && dias > 0) {
    return Math.round(dias / 30.4375);
  }

  const ymd = contributionYmdFromExpediente(expediente);
  const fromParts = ymd.years * 12 + ymd.months + ymd.days / 30.4375;
  return fromParts > 0 ? Math.round(fromParts) : 0;
}

/** Etiqueta corta de cotización: «33 a · 7 m · 1 d». */
export function formatContributionLabel(expediente: ExpedienteDigital): string {
  const ymd = contributionYmdFromExpediente(expediente);
  if (ymd.years === 0 && ymd.months === 0 && ymd.days === 0) {
    if (expediente.resumen.totalDiasCotizacion?.value != null) {
      return `${expediente.resumen.totalDiasCotizacion.value} días`;
    }
    return '—';
  }
  const parts = [`${ymd.years} a`];
  if (ymd.months > 0) parts.push(`${ymd.months} m`);
  if (ymd.days > 0) parts.push(`${ymd.days} d`);
  return parts.join(' · ');
}

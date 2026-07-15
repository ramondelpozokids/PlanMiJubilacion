/**
 * Lectura de datos del expediente para futuros cálculos.
 * IMPORTANTE: solo datos documentados. Nunca rellena bases futuras ni inventadas.
 */
import type { ExpedienteDigital } from '@/lib/expediente/types';
import type { PensionInput } from './pension';

function parseBirthDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const dmy = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return null;
}

function parsePeriodKey(period: string): { year: number; month: number } | null {
  const m1 = period.match(/(\d{2})\/(\d{4})/);
  if (m1) return { month: parseInt(m1[1], 10), year: parseInt(m1[2], 10) };
  const m2 = period.match(/(\d{4})-(\d{2})/);
  if (m2) return { year: parseInt(m2[1], 10), month: parseInt(m2[2], 10) };
  return null;
}

export interface DocumentedBase {
  periodKey: string; // YYYY-MM
  base: number;
  regimen: string | null;
  empresa: string | null;
}

/**
 * Solo bases que aparecen en documentos. Sin proyección hasta jubilación.
 * Orden cronológico (más antigua → más reciente).
 */
export function listDocumentedBases(expediente: ExpedienteDigital): DocumentedBase[] {
  const byKey = new Map<string, DocumentedBase>();

  for (const b of expediente.bases) {
    const period = b.periodo?.value;
    const base = b.base?.value;
    if (!period || base == null) continue;
    const parsed = parsePeriodKey(period);
    if (!parsed) continue;
    const key = `${parsed.year}-${String(parsed.month).padStart(2, '0')}`;
    byKey.set(key, {
      periodKey: key,
      base,
      regimen: b.regimen?.value ?? null,
      empresa: b.empresa?.value ?? null,
    });
  }

  for (const p of expediente.periodos) {
    const base = p.baseCotizacion?.value ?? p.salario?.value;
    const alta = p.fechaAlta?.value;
    if (base == null || !alta) continue;
    const dmy = alta.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dmy) continue;
    const key = `${dmy[3]}-${dmy[2]}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        periodKey: key,
        base,
        regimen: p.regimen?.value ?? null,
        empresa: p.empresa?.value ?? null,
      });
    }
  }

  return [...byKey.values()]
    .filter((b) => {
      const [y, m] = b.periodKey.split('-').map(Number);
      if (!y || !m) return false;
      const now = new Date();
      return y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1);
    })
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey));
}

/** @deprecated Usar listDocumentedBases — no rellena meses faltantes. */
export function buildBasesFromExpediente(expediente: ExpedienteDigital): number[] {
  return listDocumentedBases(expediente).map((b) => b.base);
}

/**
 * Prepara input de cálculo. Solo bases documentadas (sin inventar meses).
 * El padding estimativo vive en retirement-outlook (quality=partial, etiquetado).
 */
export const CALCULATIONS_ENABLED = true;

export function expedienteToPensionInput(
  expediente: ExpedienteDigital
): PensionInput | null {
  if (!CALCULATIONS_ENABLED) return null;

  const birthDate = parseBirthDate(expediente.identificacion.fechaNacimiento?.value ?? null);
  const anos = expediente.resumen.anosCotizados?.value ?? 0;
  const meses = expediente.resumen.mesesCotizados?.value ?? 0;
  const totalMonthsContributed = anos * 12 + meses;
  if (!birthDate || totalMonthsContributed <= 0) return null;

  const documented = listDocumentedBases(expediente);
  if (documented.length === 0) return null;

  // Solo bases reales; el motor de cálculo futuro decidirá cómo completar lagunas.
  const basesLast300Months = documented.map((d) => d.base);

  return {
    birthDate,
    retirementDate: new Date().toISOString().slice(0, 10),
    basesLast300Months,
    totalMonthsContributed,
    isVoluntaryEarlyRetirement: false,
    monthsOfEarlyRetirement: 0,
    hasDependents: false,
  };
}

export function canCalculateFromExpediente(expediente: ExpedienteDigital): boolean {
  return CALCULATIONS_ENABLED && expedienteToPensionInput(expediente) != null;
}

export function expedienteDataStats(expediente: ExpedienteDigital) {
  const bases = listDocumentedBases(expediente);
  return {
    basesDocumentadas: bases.length,
    primeraBase: bases[0]?.periodKey ?? null,
    ultimaBase: bases[bases.length - 1]?.periodKey ?? null,
    periodosLaborales: expediente.periodos.length,
    prestaciones: expediente.prestaciones.length,
  };
}

/**
 * Generador MIOP — catálogo de estrategias legales.
 * standard: ~50–200 | dense: mensual × paths × bases → cientos/miles
 */
import { addMonths, addYears, differenceInMonths } from 'date-fns';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import {
  getActiveSsRules,
  resolveOrdinaryRetirement,
} from '@/lib/rules/ss-rules';
import { quoteConvenioEspecial } from '@/lib/rules/convenio-especial';
import { listDocumentedBases } from '@/lib/calculator/from-expediente';
import type { MiopStrategy, MiopSweepMode } from './types';

function parseBirth(expediente: ExpedienteDigital): Date | null {
  const raw = expediente.identificacion.fechaNacimiento?.value;
  const dmy = raw?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!dmy) return null;
  return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
}

function avgBases(expediente: ExpedienteDigital): number | null {
  const bases = listDocumentedBases(expediente).map((b) => b.base);
  if (!bases.length) return null;
  const slice = bases.slice(-24);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function collectDates(
  birth: Date,
  asOf: Date,
  totalMonths: number,
  mode: MiopSweepMode
): Date[] {
  const rules = getActiveSsRules();
  const ordContinue = resolveOrdinaryRetirement({
    birth,
    monthsContributedNow: totalMonths,
    asOf,
    assumeContinueContributing: true,
  });
  const ordFreeze = resolveOrdinaryRetirement({
    birth,
    monthsContributedNow: totalMonths,
    asOf,
    assumeContinueContributing: false,
  });

  const age63 = addYears(birth, rules.earlyVoluntaryMinAge);
  const monthsMissing35 = Math.max(0, rules.earlyVoluntaryMinMonths - totalMonths);
  const when35 = addMonths(asOf, monthsMissing35);
  const earliestEarly = when35 > age63 ? when35 : age63;
  const end = addYears(ordContinue.date, mode === 'dense' ? 2 : 1);

  const horizonDates: Date[] = [];

  if (mode === 'dense') {
    // Un punto por mes desde la primera ventana anticipada (o hoy) hasta end
    let cursor = earliestEarly < asOf ? asOf : earliestEarly;
    // Normalizar al día 1 del mes para estabilidad
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= endMonth) {
      horizonDates.push(new Date(cursor));
      cursor = addMonths(cursor, 1);
    }
  } else {
    for (const m of [0, 3, 6, 12, 18, 24, 36, 48, 60]) {
      const d = addMonths(asOf, m);
      if (d < earliestEarly) continue;
      if (d > end) continue;
      horizonDates.push(d);
    }
  }

  horizonDates.push(earliestEarly, ordContinue.date, ordFreeze.date);
  horizonDates.push(addYears(ordContinue.date, 1));
  for (const age of [63, 64, 65, 66, 67]) {
    const d = addYears(birth, age);
    if (d >= asOf && d <= end) horizonDates.push(d);
  }

  const uniq = new Map<string, Date>();
  for (const d of horizonDates) {
    if (d < asOf) continue;
    uniq.set(d.toISOString().slice(0, 10), d);
  }
  return [...uniq.values()].sort((a, b) => a.getTime() - b.getTime());
}

export function generateMiopStrategies(
  expediente: ExpedienteDigital,
  asOf: Date = new Date(),
  mode: MiopSweepMode = 'standard'
): MiopStrategy[] {
  const birth = parseBirth(expediente);
  const anos = expediente.resumen.anosCotizados?.value ?? 0;
  const meses = expediente.resumen.mesesCotizados?.value ?? 0;
  const totalMonths = anos * 12 + meses;
  if (!birth || totalMonths <= 0) return [];

  const dates = collectDates(birth, asOf, totalMonths, mode);
  const avg = avgBases(expediente);
  const quote = quoteConvenioEspecial({
    year: asOf.getFullYear(),
    avgDocumentedBase: avg,
  });

  const convenioBases =
    mode === 'dense'
      ? [
          quote.baseMinima,
          round(quote.baseMinima * 1.05),
          quote.baseRecomendada,
          round(quote.baseRecomendada * 1.1),
          Math.min(quote.baseMaxima, quote.baseRecomendada * 1.25),
          Math.min(quote.baseMaxima, quote.baseRecomendada * 1.5),
        ]
      : [
          quote.baseMinima,
          quote.baseRecomendada,
          Math.min(quote.baseMaxima, quote.baseRecomendada * 1.15),
        ];

  const convenioMonthOptions =
    mode === 'dense' ? [6, 12, 18, 24, 30, 36, 48] : [12, 24, 36];

  const out: MiopStrategy[] = [];
  let i = 0;

  for (const retirementDate of dates) {
    out.push({
      id: `s52-${i++}`,
      name: `Subsidio +52 → ${retirementDate.toLocaleDateString('es-ES')}`,
      path: 'subsidio52',
      retirementDate,
      tags: ['subsidio52', 'primary', mode],
    });

    out.push({
      id: `frz-${i++}`,
      name: `Freeze → ${retirementDate.toLocaleDateString('es-ES')}`,
      path: 'freeze',
      retirementDate,
      tags: ['freeze', mode],
    });

    const monthsUntil = Math.max(0, differenceInMonths(retirementDate, asOf));
    for (const cMonths of convenioMonthOptions) {
      if (cMonths > monthsUntil + 12) continue;
      for (const base of convenioBases) {
        out.push({
          id: `cv-${i++}`,
          name: `Convenio ${cMonths}m @${Math.round(base)}€ → ${retirementDate.toLocaleDateString('es-ES')}`,
          path: 'subsidio52_convenio',
          retirementDate,
          convenioMonths: cMonths,
          convenioBase: base,
          tags: ['subsidio52', 'convenio', mode],
        });
      }
    }
  }

  return out;
}

/** Construye estrategia desde knobs del simulador libre. */
export function strategyFromFreeKnobs(input: {
  name?: string;
  path: MiopStrategy['path'];
  retirementDate: string | Date;
  convenioMonths?: number;
  convenioBase?: number | null;
  futureMonthlyBase?: number | null;
  irpfRetention?: number | null;
  expectancyYearsFrom65?: number | null;
  subsidioMayores52From?: string | null;
  inflationAnnual?: number | null;
}): MiopStrategy {
  const retirementDate =
    typeof input.retirementDate === 'string'
      ? new Date(input.retirementDate + (input.retirementDate.length === 10 ? 'T12:00:00' : ''))
      : input.retirementDate;

  return {
    id: `free-${Date.now().toString(36)}`,
    name: input.name?.trim() || 'Simulación libre',
    path: input.path,
    retirementDate,
    convenioMonths: input.convenioMonths ?? 0,
    convenioBase: input.convenioBase ?? null,
    futureMonthlyBase: input.futureMonthlyBase ?? null,
    irpfRetention: input.irpfRetention ?? null,
    expectancyYearsFrom65: input.expectancyYearsFrom65 ?? null,
    subsidioMayores52From: input.subsidioMayores52From ?? null,
    inflationAnnual: input.inflationAnnual ?? null,
    tags: ['free', input.path],
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

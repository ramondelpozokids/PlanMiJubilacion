/**
 * Generador MIOP — catálogo amplio de estrategias legales.
 * Ramón-path (subsidio+52) + grid fechas × vías × (opcional convenio).
 */
import { addMonths, addYears, differenceInMonths } from 'date-fns';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import {
  getActiveSsRules,
  resolveOrdinaryRetirement,
} from '@/lib/rules/ss-rules';
import { quoteConvenioEspecial } from '@/lib/rules/convenio-especial';
import { listDocumentedBases } from '@/lib/calculator/from-expediente';
import type { MiopStrategy } from './types';

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

/**
 * Genera cientos de estrategias: fechas × paths × bases convenio.
 */
export function generateMiopStrategies(
  expediente: ExpedienteDigital,
  asOf: Date = new Date()
): MiopStrategy[] {
  const birth = parseBirth(expediente);
  const anos = expediente.resumen.anosCotizados?.value ?? 0;
  const meses = expediente.resumen.mesesCotizados?.value ?? 0;
  const totalMonths = anos * 12 + meses;
  if (!birth || totalMonths <= 0) return [];

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

  const dateOffsets = [0, 3, 6, 12, 18, 24, 36, 48, 60];
  const horizonDates: Date[] = [];
  for (const m of dateOffsets) {
    const d = addMonths(asOf, m);
    if (d < earliestEarly) continue;
    if (d > addYears(ordContinue.date, 2)) continue;
    horizonDates.push(d);
  }
  horizonDates.push(earliestEarly, ordContinue.date, ordFreeze.date);
  horizonDates.push(addYears(ordContinue.date, 1));
  // Cumplir 64 / 65 si están en ventana
  for (const age of [63, 64, 65, 66]) {
    const d = addYears(birth, age);
    if (d >= asOf && d <= addYears(ordContinue.date, 2)) horizonDates.push(d);
  }

  // Dedup por YYYY-MM-DD
  const uniq = new Map<string, Date>();
  for (const d of horizonDates) {
    const key = d.toISOString().slice(0, 10);
    uniq.set(key, d);
  }
  const dates = [...uniq.values()].sort((a, b) => a.getTime() - b.getTime());

  const avg = avgBases(expediente);
  const quote = quoteConvenioEspecial({
    year: asOf.getFullYear(),
    avgDocumentedBase: avg,
  });
  const convenioBases = [
    quote.baseMinima,
    quote.baseRecomendada,
    Math.min(quote.baseMaxima, quote.baseRecomendada * 1.15),
  ];
  const convenioMonthOptions = [0, 12, 24, 36];

  const out: MiopStrategy[] = [];
  let i = 0;

  for (const retirementDate of dates) {
    // Path A: solo subsidio +52
    out.push({
      id: `s52-${i++}`,
      name: `Subsidio +52 → jubilar ${retirementDate.toLocaleDateString('es-ES')}`,
      path: 'subsidio52',
      retirementDate,
      tags: ['subsidio52', 'primary'],
    });

    // Path B: freeze (sin cotizar)
    out.push({
      id: `frz-${i++}`,
      name: `Sin cotizar más → ${retirementDate.toLocaleDateString('es-ES')}`,
      path: 'freeze',
      retirementDate,
      tags: ['freeze'],
    });

    // Path C: subsidio + convenio (grid)
    const monthsUntil = Math.max(0, differenceInMonths(retirementDate, asOf));
    for (const cMonths of convenioMonthOptions) {
      if (cMonths === 0) continue;
      if (cMonths > monthsUntil + 6) continue;
      for (const base of convenioBases) {
        out.push({
          id: `cv-${i++}`,
          name: `Subsidio+convenio ${cMonths}m @${Math.round(base)}€ → ${retirementDate.toLocaleDateString('es-ES')}`,
          path: 'subsidio52_convenio',
          retirementDate,
          convenioMonths: cMonths,
          convenioBase: base,
          tags: ['subsidio52', 'convenio'],
        });
      }
    }
  }

  return out;
}

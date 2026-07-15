/**
 * Motor de Cálculo MIOP — evalúa UN escenario. Sin recomendaciones.
 */
import { differenceInMonths } from 'date-fns';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { getActiveEconomicParams } from '@/lib/rules/economic';
import {
  getActiveSsRules,
  getEarlyCoefficientPerQuarter,
  resolveOrdinaryRetirement,
} from '@/lib/rules/ss-rules';
import {
  convenioCostTotal,
  quoteConvenioEspecial,
} from '@/lib/rules/convenio-especial';
import { listDocumentedBases } from './from-expediente';
import {
  applyEarlyReduction,
  getRealPensionSnapshot,
} from './real-pension';
import { DEFAULT_LIFE_PATH, type LifePathAssumptions } from './life-path';
import type { MiopStrategy } from '@/lib/optimization/types';

export interface EconomicOutcome {
  strategyId: string;
  strategyName: string;
  retirementDate: Date;
  retirementAge: number;
  monthsEarly: number;
  reductionPercent: number;
  pensionMensual: number | null;
  pensionAnual: number | null;
  pensionNeto: number | null;
  baseReguladora: number | null;
  porcentaje: number | null;
  convenioCost: number;
  subsidioBrutoUntil: number;
  lifetimeBenefit: number | null;
  roi: number | null;
  breakEvenMonths: number | null;
  quality: 'full' | 'partial' | 'none';
  notes: string;
  legalFlags: string[];
}

function parseBirth(expediente: ExpedienteDigital): Date | null {
  const raw = expediente.identificacion.fechaNacimiento?.value;
  const dmy = raw?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!dmy) return null;
  return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
}

function ageAt(birth: Date, when: Date): number {
  let age = when.getFullYear() - birth.getFullYear();
  const m = when.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && when.getDate() < birth.getDate())) age--;
  return age;
}

function avgBases(expediente: ExpedienteDigital): number | null {
  const bases = listDocumentedBases(expediente).map((b) => b.base);
  if (bases.length === 0) return null;
  const last = bases.slice(-24);
  return last.reduce((a, b) => a + b, 0) / last.length;
}

/**
 * Evalúa una estrategia MIOP → solo números.
 */
export function evaluateScenario(
  expediente: ExpedienteDigital,
  strategy: MiopStrategy,
  asOf: Date = new Date()
): EconomicOutcome | null {
  const birth = parseBirth(expediente);
  const anos = expediente.resumen.anosCotizados?.value ?? 0;
  const meses = expediente.resumen.mesesCotizados?.value ?? 0;
  const totalMonths = anos * 12 + meses;
  if (!birth || totalMonths <= 0) return null;

  const eco = getActiveEconomicParams();
  const rules = getActiveSsRules();
  const retirementDate = strategy.retirementDate;
  const ord = resolveOrdinaryRetirement({
    birth,
    monthsContributedNow: totalMonths,
    asOf,
    assumeContinueContributing: strategy.path !== 'freeze',
  }).date;

  const monthsEarly = Math.max(0, differenceInMonths(ord, retirementDate));
  const yearsAtRet =
    (totalMonths + Math.max(0, differenceInMonths(retirementDate, asOf))) / 12;
  const coef = getEarlyCoefficientPerQuarter(yearsAtRet, rules);
  const quarters = monthsEarly > 0 ? Math.ceil(monthsEarly / 3) : 0;
  const reductionPercent =
    monthsEarly > 0 ? Math.min(50, Math.round(quarters * coef * 10000) / 100) : 0;

  let lifePath: LifePathAssumptions = { ...DEFAULT_LIFE_PATH };
  if (strategy.subsidioMayores52From) {
    lifePath = {
      ...lifePath,
      subsidioMayores52From: strategy.subsidioMayores52From,
    };
  }
  let convenioCost = 0;
  const legalFlags: string[] = [];

  if (strategy.path === 'freeze') {
    lifePath = {
      ...lifePath,
      subsidioMayores52From: '2099-01',
      desempleoBaseAntesSubsidio: 0,
      subsidioCotizacionBase: null,
    };
    legalFlags.push('freeze');
  } else if (strategy.path === 'subsidio52') {
    legalFlags.push('subsidio52');
  } else if (strategy.path === 'subsidio52_convenio') {
    legalFlags.push('subsidio52', 'convenio');
    const quote = quoteConvenioEspecial({
      year: asOf.getFullYear(),
      base: strategy.convenioBase ?? null,
      avgDocumentedBase: avgBases(expediente),
    });
    const months = strategy.convenioMonths ?? 0;
    convenioCost = convenioCostTotal(quote.cuotaMensual, months);
    if (strategy.convenioBase != null && strategy.convenioBase > 0) {
      lifePath = {
        ...lifePath,
        // Durante convenio usamos esa base; simplificación: override flat
        subsidioCotizacionBase: strategy.convenioBase,
      };
    }
  }

  if (strategy.futureMonthlyBase != null && strategy.futureMonthlyBase > 0) {
    lifePath = {
      ...lifePath,
      subsidioCotizacionBase: strategy.futureMonthlyBase,
    };
  }

  const snap = getRealPensionSnapshot(expediente, {
    lifePath,
    retirementDate,
    asOf,
  });

  let pensionMensual = snap.ordinaryMonthly;
  if (pensionMensual != null && monthsEarly > 0) {
    pensionMensual = applyEarlyReduction(pensionMensual, monthsEarly, yearsAtRet).monthly;
  }

  const irpf =
    strategy.irpfRetention != null && strategy.irpfRetention >= 0
      ? strategy.irpfRetention
      : eco.irpf.defaultRetention;
  const pensionNeto =
    pensionMensual != null ? round2(pensionMensual * (1 - irpf)) : null;
  const pensionAnual =
    pensionMensual != null ? round2(pensionMensual * 14) : null;

  const age = ageAt(birth, retirementDate);
  const expectancy =
    strategy.expectancyYearsFrom65 != null && strategy.expectancyYearsFrom65 > 0
      ? strategy.expectancyYearsFrom65
      : eco.expectancyYearsFrom65;
  const yearsLeft = Math.max(10, expectancy + 65 - age);

  // Inflación opcional: deflacta beneficio vida a valor presente simple
  const inflation = strategy.inflationAnnual ?? 0;
  let lifetimeRaw =
    pensionMensual != null
      ? pensionMensual * 14 * yearsLeft - convenioCost
      : null;
  if (lifetimeRaw != null && inflation > 0 && yearsLeft > 0) {
    // media geo aproximada: divide por (1+i)^(años/2)
    lifetimeRaw = lifetimeRaw / Math.pow(1 + inflation, yearsLeft / 2);
  }
  const lifetimeBenefit = lifetimeRaw != null ? round2(lifetimeRaw) : null;

  let breakEvenMonths: number | null = null;
  if (convenioCost > 0 && pensionMensual != null) {
    breakEvenMonths = Math.ceil(convenioCost / Math.max(1, pensionMensual * 0.05));
  }

  const quality =
    snap.quality === 'full_bases'
      ? 'full'
      : snap.quality === 'bases_plus_path'
        ? 'partial'
        : 'none';

  return {
    strategyId: strategy.id,
    strategyName: strategy.name,
    retirementDate,
    retirementAge: age,
    monthsEarly,
    reductionPercent,
    pensionMensual,
    pensionAnual,
    pensionNeto,
    baseReguladora: snap.baseReguladora,
    porcentaje: snap.percentageByYears,
    convenioCost,
    subsidioBrutoUntil: 0,
    lifetimeBenefit,
    roi: convenioCost > 0 && lifetimeBenefit != null ? round2(lifetimeBenefit / convenioCost) : null,
    breakEvenMonths,
    quality,
    notes: snap.note,
    legalFlags,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

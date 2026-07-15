/**
 * Parámetros Seguridad Social — Ley 27/2011 (calendario progresivo).
 * Importes/límites: Motor Económico (`economic-params.json`).
 * Calendario de edades: código (estructura legal estable).
 */
import { addMonths, addYears, differenceInMonths } from 'date-fns';
import { getEconomicParams } from './economic';

export interface YearRetirementRules {
  year: number;
  monthsForAge65: number;
  ordinaryAgeYears: number;
}

export function rulesForRetirementYear(year: number): YearRetirementRules {
  if (year <= 2024) {
    return { year, monthsForAge65: 38 * 12, ordinaryAgeYears: 66 + 6 / 12 };
  }
  if (year === 2025) {
    return { year, monthsForAge65: 38 * 12 + 3, ordinaryAgeYears: 66 + 8 / 12 };
  }
  if (year === 2026) {
    return { year, monthsForAge65: 38 * 12 + 3, ordinaryAgeYears: 66 + 10 / 12 };
  }
  return { year, monthsForAge65: 38 * 12 + 6, ordinaryAgeYears: 67 };
}

export type SsRules = {
  year: number;
  maxPensionMonthly: number;
  minPension65NoSpouse: number;
  retirementAgeOrdinary: number;
  retirementAgeWithCareer: number;
  monthsForAge65: number;
  monthsForBaseReguladora: number;
  divisor: number;
  minYearsForPension: number;
  yearsFor100Percent: number;
  earlyVoluntaryMinAge: number;
  earlyVoluntaryMinMonths: number;
  earlyRetirementCoefficients: {
    lessThan38y6m: number;
    between38y6mAnd41y6m: number;
    between41y6mAnd44y6m: number;
    moreThan44y6m: number;
  };
  delayedRetirementBonusPerYear: number;
};

/** Reglas activas: calendario del año + importes del Motor Económico. */
export function getActiveSsRules(asOfYear = new Date().getFullYear()): SsRules {
  const eco = getEconomicParams(asOfYear);
  const cal = rulesForRetirementYear(asOfYear);
  return {
    year: asOfYear,
    maxPensionMonthly: eco.maxPensionMonthly,
    minPension65NoSpouse: eco.minPension65NoSpouse,
    retirementAgeOrdinary: cal.ordinaryAgeYears,
    retirementAgeWithCareer: 65,
    monthsForAge65: cal.monthsForAge65,
    monthsForBaseReguladora: eco.monthsForBaseReguladora,
    divisor: eco.divisorBr,
    minYearsForPension: eco.pensionPct.minYears,
    yearsFor100Percent: eco.pensionPct.yearsFor100,
    earlyVoluntaryMinAge: eco.earlyVoluntaryMinAge,
    earlyVoluntaryMinMonths: eco.earlyVoluntaryMinMonths,
    earlyRetirementCoefficients: { ...eco.earlyCoefficients },
    delayedRetirementBonusPerYear: eco.delayedBonusPerYear,
  };
}

/** @deprecated Usar getActiveSsRules() */
export const SS_RULES_2026 = getActiveSsRules(2026);
export const SS_RULES_2024 = SS_RULES_2026;

export function monthsToYearsMonths(totalMonths: number): { years: number; months: number } {
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
  };
}

/** ¿Tiene carrera completa HOY según reglas del año actual? (raro que baste solo) */
export function qualifiesFor65(
  totalMonthsContributed: number,
  rules: SsRules = SS_RULES_2026
): boolean {
  const yearRules = rulesForRetirementYear(rules.year);
  return totalMonthsContributed >= yearRules.monthsForAge65;
}

/**
 * @deprecated Usar resolveOrdinaryRetirement — no proyecta cotización futura.
 */
export function ordinaryRetirementAgeYears(
  totalMonthsContributed: number,
  rules: SsRules = SS_RULES_2026
): number {
  return qualifiesFor65(totalMonthsContributed, rules)
    ? rules.retirementAgeWithCareer
    : rules.retirementAgeOrdinary;
}

export interface OrdinaryRetirementResolution {
  ageYears: number;
  date: Date;
  at65: boolean;
  monthsAtRetirement: number;
  monthsRequiredFor65: number;
  /** Meses que aún faltan cotizar (proyectando) para llegar a 65 con carrera */
  monthsStillNeededFor65: number;
  assumption: 'continue' | 'freeze';
  explanation: string;
}

function addFractionalAge(birth: Date, ageYears: number): Date {
  const years = Math.floor(ageYears);
  const months = Math.round((ageYears - years) * 12);
  return addMonths(addYears(birth, years), months);
}

/**
 * Edad/fech ordinaria como el simulador SS:
 * evalúa los meses cotizados en la fecha candidata (por defecto sumando cotización continua).
 */
export function resolveOrdinaryRetirement(params: {
  birth: Date;
  monthsContributedNow: number;
  asOf?: Date;
  /** Default true: como simulador SS si sigues cotizando hasta la fecha */
  assumeContinueContributing?: boolean;
}): OrdinaryRetirementResolution {
  const asOf = params.asOf ?? new Date();
  const continueC = params.assumeContinueContributing !== false;
  const assumption = continueC ? 'continue' : 'freeze';
  const date65 = addYears(params.birth, 65);
  const year65 = date65.getFullYear();
  const at65Rules = rulesForRetirementYear(year65);

  const monthsAt = (when: Date) =>
    params.monthsContributedNow +
    (continueC ? Math.max(0, differenceInMonths(when, asOf)) : 0);

  const projectedAt65 = monthsAt(date65);
  const stillNeeded = Math.max(0, at65Rules.monthsForAge65 - projectedAt65);

  if (projectedAt65 >= at65Rules.monthsForAge65) {
    const { years, months } = monthsToYearsMonths(projectedAt65);
    return {
      ageYears: 65,
      date: date65,
      at65: true,
      monthsAtRetirement: projectedAt65,
      monthsRequiredFor65: at65Rules.monthsForAge65,
      monthsStillNeededFor65: 0,
      assumption,
      explanation: continueC
        ? `A los 65 (${year65}) con carrera completa proyectada (~${years}a ${months}m cotizados). La SS exige ${Math.floor(at65Rules.monthsForAge65 / 12)}a ${at65Rules.monthsForAge65 % 12}m en esa fecha.`
        : `A los 65 con la cotización actual (sin proyectar).`,
    };
  }

  // Sin carrera a los 65 → edad ordinaria del año en que la alcanza
  // Para 2027+: 67 años. Antes: 66y + meses según año.
  // Calculamos la fecha ordinaria y re-evaluamos reglas de ESE año.
  let ordinaryAge = at65Rules.ordinaryAgeYears;
  let dateOrd = addFractionalAge(params.birth, ordinaryAge);
  const ordYearRules = rulesForRetirementYear(dateOrd.getFullYear());
  ordinaryAge = ordYearRules.ordinaryAgeYears;
  dateOrd = addFractionalAge(params.birth, ordinaryAge);

  const monthsAtOrd = monthsAt(dateOrd);
  const { years, months } = monthsToYearsMonths(params.monthsContributedNow);

  return {
    ageYears: ordinaryAge,
    date: dateOrd,
    at65: false,
    monthsAtRetirement: monthsAtOrd,
    monthsRequiredFor65: at65Rules.monthsForAge65,
    monthsStillNeededFor65: stillNeeded,
    assumption,
    explanation: continueC
      ? `Hoy ${years}a ${months}m. Aun cotizando hasta los 65 no llegas a ${Math.floor(at65Rules.monthsForAge65 / 12)}a ${at65Rules.monthsForAge65 % 12}m (faltan ${stillNeeded} meses). Ordinaria: ${formatAgeYearsMonths(ordinaryAge)}.`
      : `Sin nueva cotización no hay carrera a los 65. Ordinaria: ${formatAgeYearsMonths(ordinaryAge)}.`,
  };
}

export function formatAgeYearsMonths(ageYears: number): string {
  const years = Math.floor(ageYears);
  const months = Math.round((ageYears - years) * 12);
  if (months === 0) return `${years} años`;
  if (months === 12) return `${years + 1} años`;
  return `${years} años y ${months} meses`;
}

export function getEarlyCoefficientPerQuarter(
  yearsContributed: number,
  rules: SsRules = SS_RULES_2026
): number {
  const c = rules.earlyRetirementCoefficients;
  if (yearsContributed < 38 + 6 / 12) return c.lessThan38y6m;
  if (yearsContributed < 41 + 6 / 12) return c.between38y6mAnd41y6m;
  if (yearsContributed < 44 + 6 / 12) return c.between41y6mAnd44y6m;
  return c.moreThan44y6m;
}

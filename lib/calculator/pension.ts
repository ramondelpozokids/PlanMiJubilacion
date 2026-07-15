/**
 * Motor de cálculo de pensión — importes desde Motor Económico.
 */
import {
  getActiveSsRules,
  getEarlyCoefficientPerQuarter,
} from '@/lib/rules/ss-rules';
import { getActiveEconomicParams } from '@/lib/rules/economic';

export interface PensionInput {
  birthDate: string;
  retirementDate: string;
  basesLast300Months: number[];
  totalMonthsContributed: number;
  isVoluntaryEarlyRetirement?: boolean;
  monthsOfEarlyRetirement?: number;
  hasDependents?: boolean;
}

export interface PensionResult {
  baseReguladora: number;
  percentageByYears: number;
  monthlyPension: number;
  annualPension: number;
  effectivePension: number;
  isCapped: boolean;
  maxPension2024: number;
  disclaimer: string;
}

export function calculatePension(input: PensionInput): PensionResult {
  const rules = getActiveSsRules();
  const { basesLast300Months, totalMonthsContributed, monthsOfEarlyRetirement = 0 } = input;

  const bases =
    basesLast300Months.length === rules.monthsForBaseReguladora
      ? basesLast300Months
      : padBases(basesLast300Months, rules.monthsForBaseReguladora);

  const sumBases = bases.reduce((sum, b) => sum + b, 0);
  const baseReguladora = sumBases / rules.divisor;
  const yearsContributed = totalMonthsContributed / 12;
  const percentageByYears = calculatePercentage(yearsContributed);

  let monthlyPension = baseReguladora * (percentageByYears / 100);
  let reductionFactor = 1;

  if (monthsOfEarlyRetirement > 0) {
    const quartersEarly = Math.ceil(monthsOfEarlyRetirement / 3);
    reductionFactor =
      1 - quartersEarly * getEarlyCoefficientPerQuarter(yearsContributed, rules);
    reductionFactor = Math.max(0.5, reductionFactor);
  }

  const effectivePension = monthlyPension * reductionFactor;
  const isCapped = effectivePension > rules.maxPensionMonthly;
  const finalPension = Math.min(effectivePension, rules.maxPensionMonthly);

  return {
    baseReguladora: round(
      (finalPension / (percentageByYears / 100)) * (1 / reductionFactor)
    ),
    percentageByYears,
    monthlyPension: round(finalPension),
    annualPension: round(finalPension * 14),
    effectivePension: round(finalPension),
    isCapped,
    maxPension2024: rules.maxPensionMonthly,
    disclaimer:
      'Cálculo orientativo. Parámetros desde Motor Económico. Oficial: Seguridad Social.',
  };
}

function calculatePercentage(years: number): number {
  const p = getActiveEconomicParams().pensionPct;
  if (years < p.minYears) return p.basePctAt15;
  const monthsAfter15 = (years - p.minYears) * 12;
  let percentage = p.basePctAt15;
  percentage += Math.min(monthsAfter15, p.monthsFirstBand) * p.monthlyAddFirst102;
  percentage += Math.max(0, monthsAfter15 - p.monthsFirstBand) * p.monthlyAddAfter102;
  return Math.min(100, percentage);
}

function padBases(bases: number[], length: number): number[] {
  if (bases.length >= length) return bases.slice(0, length);
  const last = bases[bases.length - 1] || 0;
  return [...bases, ...Array(length - bases.length).fill(last)];
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

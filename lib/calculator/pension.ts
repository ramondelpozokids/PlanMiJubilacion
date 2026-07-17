/**
 * Motor de cálculo de pensión — importes desde Motor Económico.
 * Reducción anticipada: tablas oficiales BOE (lib/rules/early-retirement).
 */
import { getActiveSsRules } from '@/lib/rules/ss-rules';
import { getActiveEconomicParams } from '@/lib/rules/economic';
import { lookupOfficialReductionPercent, resolveCareerBracket } from '@/lib/rules/early-retirement';

export interface PensionInput {
  birthDate: string;
  retirementDate: string;
  basesLast300Months: number[];
  totalMonthsContributed: number;
  isVoluntaryEarlyRetirement?: boolean;
  monthsOfEarlyRetirement?: number;
  hasDependents?: boolean;
  /** Año del hecho causante para elegir tabla. */
  rulesYear?: number;
  declareInvoluntaryCause?: boolean;
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
  let reductionPercent = 0;

  if (monthsOfEarlyRetirement > 0) {
    const bracket = resolveCareerBracket(Math.floor(totalMonthsContributed));
    const year =
      input.rulesYear ??
      (input.retirementDate
        ? new Date(input.retirementDate).getFullYear()
        : new Date().getFullYear());
    const kind = input.declareInvoluntaryCause ? 'involuntary' : 'voluntary';
    const looked = lookupOfficialReductionPercent({
      kind,
      year,
      monthsEarly: monthsOfEarlyRetirement,
      bracketId: bracket.id,
    });
    reductionPercent = looked.reductionPercent;
    const exceedsMax = monthlyPension > rules.maxPensionMonthly;
    if (exceedsMax && kind === 'voluntary') {
      const overMax = lookupOfficialReductionPercent({
        kind: 'voluntary_over_max',
        year,
        monthsEarly: monthsOfEarlyRetirement,
        bracketId: bracket.id,
      });
      reductionPercent = overMax.reductionPercent;
      monthlyPension = rules.maxPensionMonthly * (1 - reductionPercent / 100);
    } else {
      monthlyPension = monthlyPension * (1 - reductionPercent / 100);
    }
  }

  const isCapped = monthlyPension > rules.maxPensionMonthly && monthsOfEarlyRetirement <= 0;
  const finalPension = Math.min(monthlyPension, rules.maxPensionMonthly);

  return {
    baseReguladora: round(baseReguladora),
    percentageByYears,
    monthlyPension: round(finalPension),
    annualPension: round(finalPension * 14),
    effectivePension: round(finalPension),
    isCapped,
    maxPension2024: rules.maxPensionMonthly,
    disclaimer:
      reductionPercent > 0
        ? `Cálculo orientativo. Reducción anticipada oficial ${reductionPercent}% (tabla BOE). Oficial: Seguridad Social.`
        : 'Cálculo orientativo. Parámetros desde Motor Económico. Oficial: Seguridad Social.',
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

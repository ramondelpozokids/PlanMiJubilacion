import { CAREER_BRACKETS, type CareerBracket } from './types';

/**
 * Tramo de cotización (periodos completos; la fracción no computa — art. 207/208).
 */
export function resolveCareerBracket(completeContributionMonths: number): CareerBracket {
  const months = Math.max(0, Math.floor(completeContributionMonths));
  for (const b of CAREER_BRACKETS) {
    const underMax = b.maxMonthsExclusive == null || months < b.maxMonthsExclusive;
    if (months >= b.minMonthsInclusive && underMax) return b;
  }
  return CAREER_BRACKETS[CAREER_BRACKETS.length - 1]!;
}

/**
 * Scoring MIOP 100 pts — puro cálculo, sin IA.
 */
import type { EconomicOutcome } from '@/lib/calculator/evaluate';
import { getActiveEconomicParams } from '@/lib/rules/economic';
import type { ScoredStrategy } from './types';

function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

export function scoreOutcomes(outcomes: EconomicOutcome[]): ScoredStrategy[] {
  const weights = getActiveEconomicParams().miopWeights;
  const withPension = outcomes.filter((o) => o.pensionMensual != null && o.pensionMensual > 0);
  const pool = withPension.length > 0 ? withPension : outcomes;

  const lifetimes = pool.map((o) => o.lifetimeBenefit ?? 0);
  const pensions = pool.map((o) => o.pensionMensual ?? 0);
  const costs = pool.map((o) => o.convenioCost);
  const minL = Math.min(...lifetimes);
  const maxL = Math.max(...lifetimes);
  const minP = Math.min(...pensions);
  const maxP = Math.max(...pensions);
  const minC = Math.min(...costs);
  const maxC = Math.max(...costs);

  const scored: ScoredStrategy[] = pool.map((o) => {
    const lifetimeBenefit = normalize(o.lifetimeBenefit ?? 0, minL, maxL);
    const monthlyPension = normalize(o.pensionMensual ?? 0, minP, maxP);
    const lowUpfrontCost = 100 - normalize(o.convenioCost, minC, maxC || 1);
    const roiBreakEven =
      o.breakEvenMonths != null
        ? Math.max(0, 100 - Math.min(100, o.breakEvenMonths / 2))
        : o.convenioCost === 0
          ? 80
          : 40;
    const legalStability = o.legalFlags.includes('freeze')
      ? 40
      : o.legalFlags.includes('convenio')
        ? 70
        : 90;

    const score = round1(
      (lifetimeBenefit * weights.lifetimeBenefit +
        monthlyPension * weights.monthlyPension +
        lowUpfrontCost * weights.lowUpfrontCost +
        roiBreakEven * weights.roiBreakEven +
        legalStability * weights.legalStability) /
        100
    );

    return {
      outcome: o,
      score,
      dimensions: {
        lifetimeBenefit: round1(lifetimeBenefit),
        monthlyPension: round1(monthlyPension),
        lowUpfrontCost: round1(lowUpfrontCost),
        roiBreakEven: round1(roiBreakEven),
        legalStability,
      },
      rank: 0,
      explanation: buildExplanation(o, score),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((s, i) => {
    s.rank = i + 1;
  });
  return scored;
}

function buildExplanation(o: EconomicOutcome, score: number): string {
  return [
    `Score ${score}/100.`,
    o.pensionMensual != null
      ? `Pensión est. ${o.pensionMensual.toLocaleString('es-ES')} €/mes.`
      : 'Sin pensión calculable.',
    o.monthsEarly > 0 ? `Anticipada (−${o.reductionPercent}%).` : 'Sin anticipación.',
    o.convenioCost > 0
      ? `Convenio ${o.convenioCost.toLocaleString('es-ES')} €.`
      : 'Sin coste convenio.',
    o.legalFlags.includes('subsidio52') ? 'Vía subsidio +52.' : null,
    o.legalFlags.includes('freeze') ? 'Sin nuevas cotizaciones.' : null,
  ]
    .filter(Boolean)
    .join(' ');
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

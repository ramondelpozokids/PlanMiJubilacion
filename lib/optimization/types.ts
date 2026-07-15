/**
 * Tipos del Motor de Optimización MIOP.
 * Cálculo produce EconomicOutcome; aquí solo estrategia + score + rank.
 */

export type MiopPath =
  | 'subsidio52'
  | 'subsidio52_convenio'
  | 'freeze';

export interface MiopStrategy {
  id: string;
  name: string;
  path: MiopPath;
  retirementDate: Date;
  /** Meses de convenio especial antes de jubilar */
  convenioMonths?: number;
  convenioBase?: number | null;
  futureMonthlyBase?: number | null;
  tags: string[];
}

export interface ScoredStrategy {
  outcome: import('@/lib/calculator/evaluate').EconomicOutcome;
  score: number;
  dimensions: {
    lifetimeBenefit: number;
    monthlyPension: number;
    lowUpfrontCost: number;
    roiBreakEven: number;
    legalStability: number;
  };
  rank: number;
  explanation: string;
}

export interface MiopRunResult {
  generatedAt: string;
  economicFingerprint: string;
  strategiesEvaluated: number;
  podium: ScoredStrategy[];
  allRanked: ScoredStrategy[];
  conclusions: string[];
}

/**
 * Tipos del Motor de Optimización MIOP.
 * Cálculo produce EconomicOutcome; aquí solo estrategia + score + rank.
 */

export type MiopPath =
  | 'subsidio52'
  | 'subsidio52_convenio'
  | 'freeze';

export type MiopSweepMode = 'standard' | 'dense';

export interface MiopStrategy {
  id: string;
  name: string;
  path: MiopPath;
  retirementDate: Date;
  convenioMonths?: number;
  convenioBase?: number | null;
  futureMonthlyBase?: number | null;
  /** Overrides libres (simulador MIOP) */
  irpfRetention?: number | null;
  expectancyYearsFrom65?: number | null;
  subsidioMayores52From?: string | null;
  inflationAnnual?: number | null;
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
  strategiesGenerated: number;
  mode: MiopSweepMode;
  podium: ScoredStrategy[];
  allRanked: ScoredStrategy[];
  conclusions: string[];
  /** Ms del barrido (útil en dense) */
  elapsedMs: number;
}

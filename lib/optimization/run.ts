/**
 * MIOP — orquestación Optimización (nunca dentro de OCR).
 * Documental → Reglas → Cálculo(evaluate) → aquí rank + conclusiones.
 */
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { evaluateScenario } from '@/lib/calculator/evaluate';
import { economicParamsFingerprint } from '@/lib/rules/economic';
import { generateMiopStrategies } from './generate';
import { scoreOutcomes } from './score';
import { buildMiopConclusions } from './conclusions';
import type { MiopRunResult } from './types';

export function runMiop(
  expediente: ExpedienteDigital,
  asOf: Date = new Date()
): MiopRunResult {
  const strategies = generateMiopStrategies(expediente, asOf);
  const outcomes = strategies
    .map((s) => evaluateScenario(expediente, s, asOf))
    .filter((o): o is NonNullable<typeof o> => o != null);

  const allRanked = scoreOutcomes(outcomes);
  const podium = allRanked.slice(0, 3);
  const conclusions = buildMiopConclusions(podium);

  return {
    generatedAt: new Date().toISOString(),
    economicFingerprint: economicParamsFingerprint(),
    strategiesEvaluated: outcomes.length,
    podium,
    allRanked,
    conclusions,
  };
}

export { generateMiopStrategies } from './generate';
export { scoreOutcomes } from './score';
export { buildMiopConclusions } from './conclusions';
export type { MiopRunResult, MiopStrategy, ScoredStrategy } from './types';

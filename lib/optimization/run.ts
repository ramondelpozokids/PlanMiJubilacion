/**
 * MIOP — orquestación Optimización (nunca dentro de OCR).
 * standard: rápido para podio UI | dense: barrido masivo async por chunks
 */
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { evaluateScenario } from '@/lib/calculator/evaluate';
import { economicParamsFingerprint } from '@/lib/rules/economic';
import { generateMiopStrategies } from './generate';
import { evaluateBatch } from './evaluate-batch';
import { scoreOutcomes } from './score';
import { buildMiopConclusions } from './conclusions';
import type { MiopRunResult, MiopSweepMode } from './types';

export function runMiop(
  expediente: ExpedienteDigital,
  asOf: Date = new Date(),
  mode: MiopSweepMode = 'standard'
): MiopRunResult {
  const t0 = Date.now();
  const strategies = generateMiopStrategies(expediente, asOf, mode);
  const outcomes = strategies
    .map((s) => evaluateScenario(expediente, s, asOf))
    .filter((o): o is NonNullable<typeof o> => o != null);

  return finish(outcomes, strategies.length, mode, t0);
}

/** Barrido denso (miles) en chunks async — no bloquea el event loop. */
export async function runMiopSweep(
  expediente: ExpedienteDigital,
  options: {
    mode?: MiopSweepMode;
    asOf?: Date;
    onProgress?: (done: number, total: number) => void;
  } = {}
): Promise<MiopRunResult> {
  const t0 = Date.now();
  const mode = options.mode ?? 'dense';
  const asOf = options.asOf ?? new Date();
  const strategies = generateMiopStrategies(expediente, asOf, mode);
  const outcomes = await evaluateBatch(expediente, strategies, {
    asOf,
    onProgress: options.onProgress,
  });
  return finish(outcomes, strategies.length, mode, t0);
}

function finish(
  outcomes: import('@/lib/calculator/evaluate').EconomicOutcome[],
  generated: number,
  mode: MiopSweepMode,
  t0: number
): MiopRunResult {
  const allRanked = scoreOutcomes(outcomes);
  const podium = allRanked.slice(0, 3);
  return {
    generatedAt: new Date().toISOString(),
    economicFingerprint: economicParamsFingerprint(),
    strategiesEvaluated: outcomes.length,
    strategiesGenerated: generated,
    mode,
    podium,
    allRanked,
    conclusions: buildMiopConclusions(podium),
    elapsedMs: Date.now() - t0,
  };
}

export { generateMiopStrategies, strategyFromFreeKnobs } from './generate';
export { evaluateBatch } from './evaluate-batch';
export { scoreOutcomes } from './score';
export { buildMiopConclusions } from './conclusions';
export type { MiopRunResult, MiopStrategy, ScoredStrategy, MiopSweepMode, MiopPath } from './types';

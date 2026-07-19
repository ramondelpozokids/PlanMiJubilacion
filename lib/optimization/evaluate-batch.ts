/**
 * Evaluación por lotes — barrido MIOP sin bloquear el event loop demasiado.
 * En Next.js: chunks síncronos con yield vía setImmediate/polyfill async.
 */
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { evaluateScenario, type EconomicOutcome } from '@/lib/calculator/evaluate';
import type { LifePathAssumptions } from '@/lib/calculator/life-path';
import type { MiopStrategy } from './types';

const DEFAULT_CHUNK = 75;

function yieldEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof setImmediate === 'function') {
      setImmediate(resolve);
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Evalúa estrategias en chunks; callback opcional de progreso 0–1.
 */
export async function evaluateBatch(
  expediente: ExpedienteDigital,
  strategies: MiopStrategy[],
  options: {
    chunkSize?: number;
    asOf?: Date;
    lifePath?: LifePathAssumptions;
    onProgress?: (done: number, total: number) => void;
  } = {}
): Promise<EconomicOutcome[]> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK;
  const asOf = options.asOf ?? new Date();
  const out: EconomicOutcome[] = [];

  for (let i = 0; i < strategies.length; i += chunkSize) {
    const slice = strategies.slice(i, i + chunkSize);
    for (const s of slice) {
      const o = evaluateScenario(expediente, s, asOf, options.lifePath);
      if (o) out.push(o);
    }
    options.onProgress?.(Math.min(strategies.length, i + slice.length), strategies.length);
    if (i + chunkSize < strategies.length) {
      await yieldEventLoop();
    }
  }

  return out;
}

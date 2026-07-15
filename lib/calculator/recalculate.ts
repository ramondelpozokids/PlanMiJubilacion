/**
 * Job de recálculo SIP + MIOP.
 * OCR/merge nunca llaman optimización; solo este job (post-expediente).
 */
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { persistScenariosFromExpediente } from './persist-scenarios';
import { buildRetirementOutlook, type RetirementOutlook } from './retirement-outlook';
import { runMiop, type MiopRunResult } from '@/lib/optimization/run';

export interface RecalculateResult {
  outlook: RetirementOutlook | null;
  scenariosPersisted: number;
  subsidioParamsFingerprint: string | null;
  miop: MiopRunResult | null;
}

export async function recalculateFromExpediente(
  userId: string,
  expediente: ExpedienteDigital
): Promise<RecalculateResult> {
  const outlook = buildRetirementOutlook(expediente);
  const scenariosPersisted = await persistScenariosFromExpediente(userId, expediente);
  let miop: MiopRunResult | null = null;
  try {
    miop = runMiop(expediente);
  } catch {
    miop = null;
  }
  return {
    outlook,
    scenariosPersisted,
    subsidioParamsFingerprint: outlook?.erpPipeline.paramsFingerprint ?? null,
    miop,
  };
}

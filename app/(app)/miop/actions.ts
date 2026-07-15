'use server';

import { revalidatePath } from 'next/cache';
import { getUser } from '@/lib/supabase/server';
import { loadExpediente } from '@/lib/expediente/repository';
import { evaluateScenario } from '@/lib/calculator/evaluate';
import {
  runMiopSweep,
  strategyFromFreeKnobs,
  type MiopPath,
} from '@/lib/optimization/run';

/** Preview en tiempo real del simulador libre (mismo evaluate). */
export async function previewFreeStrategyAction(input: {
  path: MiopPath;
  retirementDate: string;
  name?: string;
  convenioMonths?: number;
  convenioBase?: number | null;
  futureMonthlyBase?: number | null;
  irpfRetention?: number | null;
  expectancyYearsFrom65?: number | null;
  subsidioMayores52From?: string | null;
  inflationAnnual?: number | null;
}) {
  const user = await getUser();
  if (!user) throw new Error('No autenticado');
  const expediente = await loadExpediente(user.id);
  if (!expediente) throw new Error('Sin expediente');

  const strategy = strategyFromFreeKnobs(input);
  const outcome = evaluateScenario(expediente, strategy);
  if (!outcome) throw new Error('No se pudo evaluar (faltan datos de expediente)');

  return {
    strategyName: outcome.strategyName,
    retirementAge: outcome.retirementAge,
    monthsEarly: outcome.monthsEarly,
    reductionPercent: outcome.reductionPercent,
    pensionMensual: outcome.pensionMensual,
    pensionAnual: outcome.pensionAnual,
    pensionNeto: outcome.pensionNeto,
    baseReguladora: outcome.baseReguladora,
    porcentaje: outcome.porcentaje,
    convenioCost: outcome.convenioCost,
    lifetimeBenefit: outcome.lifetimeBenefit,
    roi: outcome.roi,
    breakEvenMonths: outcome.breakEvenMonths,
    quality: outcome.quality,
    notes: outcome.notes,
    legalFlags: outcome.legalFlags,
  };
}

/** Barrido denso async (miles de escenarios). */
export async function runDenseSweepAction() {
  const user = await getUser();
  if (!user) throw new Error('No autenticado');
  const expediente = await loadExpediente(user.id);
  if (!expediente) throw new Error('Sin expediente');

  const result = await runMiopSweep(expediente, { mode: 'dense' });

  revalidatePath('/miop');
  revalidatePath('/comparator');

  return {
    strategiesGenerated: result.strategiesGenerated,
    strategiesEvaluated: result.strategiesEvaluated,
    elapsedMs: result.elapsedMs,
    economicFingerprint: result.economicFingerprint,
    conclusions: result.conclusions,
    podium: result.podium.map((s) => ({
      rank: s.rank,
      score: s.score,
      name: s.outcome.strategyName,
      pensionMensual: s.outcome.pensionMensual,
      lifetimeBenefit: s.outcome.lifetimeBenefit,
      convenioCost: s.outcome.convenioCost,
      explanation: s.explanation,
    })),
  };
}

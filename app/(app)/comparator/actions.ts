'use server';

import { revalidatePath } from 'next/cache';
import { getUser } from '@/lib/supabase/server';
import { loadExpediente } from '@/lib/expediente/repository';
import { simulateScenario, type ScenarioAssumptions } from '@/lib/calculator/simulate';
import { saveCustomScenario, deleteScenario } from '@/lib/calculator/persist-scenarios';

export async function createCustomScenarioAction(input: {
  name: string;
  retirementDate: string; // yyyy-mm-dd
  futureMonthlyBase?: number;
  convenioMonths?: number;
  convenioMonthlyCost?: number;
  paroMonths?: number;
  extraMonthsContributed?: number;
}) {
  const user = await getUser();
  if (!user) throw new Error('No autenticado');

  const expediente = await loadExpediente(user.id);
  if (!expediente) throw new Error('Sin expediente — sube documentos primero');

  const assumptions: ScenarioAssumptions = {
    name: input.name.trim() || 'Mi escenario',
    retirementDate: input.retirementDate,
    futureMonthlyBase: input.futureMonthlyBase ?? null,
    convenioMonths: input.convenioMonths ?? 0,
    convenioMonthlyCost: input.convenioMonthlyCost ?? 0,
    paroMonths: input.paroMonths ?? 0,
    extraMonthsContributed: input.extraMonthsContributed ?? 0,
    scenarioType: 'custom',
  };

  const simulated = simulateScenario(expediente, assumptions, 'custom');
  if (!simulated) {
    throw new Error('No se pudo calcular: faltan nacimiento/años cotizados o bases');
  }

  const id = await saveCustomScenario(user.id, simulated);

  revalidatePath('/comparator');
  revalidatePath('/dashboard');
  revalidatePath('/analysis');

  return {
    id,
    monthlyPension: simulated.result.monthlyPension,
    reductionPercent: simulated.reductionPercent,
    retirementAge: simulated.retirementAge,
    quality: simulated.quality,
  };
}

export async function deleteScenarioAction(scenarioId: string) {
  const user = await getUser();
  if (!user) throw new Error('No autenticado');
  await deleteScenario(user.id, scenarioId);
  revalidatePath('/comparator');
}

export async function regenerateSystemScenariosAction() {
  const user = await getUser();
  if (!user) throw new Error('No autenticado');
  const expediente = await loadExpediente(user.id);
  if (!expediente) throw new Error('Sin expediente');

  const { recalculateFromExpediente } = await import('@/lib/calculator/recalculate');
  await recalculateFromExpediente(user.id, expediente);

  revalidatePath('/comparator');
  revalidatePath('/dashboard');
  return { ok: true };
}

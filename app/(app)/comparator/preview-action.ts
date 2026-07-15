'use server';

import { getUser } from '@/lib/supabase/server';
import { loadExpediente } from '@/lib/expediente/repository';
import { simulateScenario } from '@/lib/calculator/simulate';
import { deriveSubsidio52Amounts, getSubsidio52Config } from '@/lib/rules/subsidio-52';

/** Preview instantánea al elegir una fecha en el calendario (no guarda). */
export async function previewRetirementDateAction(
  retirementDate: string,
  futureMonthlyBase?: number
) {
  const user = await getUser();
  if (!user) throw new Error('No autenticado');

  const expediente = await loadExpediente(user.id);
  if (!expediente) throw new Error('Sin expediente');

  const futureBase =
    futureMonthlyBase && futureMonthlyBase > 0
      ? futureMonthlyBase
      : deriveSubsidio52Amounts(getSubsidio52Config(2027)).baseCotizacion;

  const simulated = simulateScenario(
    expediente,
    {
      name: `Jubilación ${retirementDate}`,
      retirementDate,
      futureMonthlyBase: futureBase,
      scenarioType: 'calendar',
    },
    'custom'
  );

  if (!simulated) {
    throw new Error('No se pudo calcular con esa fecha');
  }

  return {
    retirementDate: simulated.retirementDate.toISOString(),
    retirementAge: simulated.retirementAge,
    monthsEarly: simulated.monthsEarly,
    reductionPercent: simulated.reductionPercent,
    monthlyPension: simulated.result.monthlyPension,
    annualPension: simulated.result.annualPension,
    percentageByYears: simulated.result.percentageByYears,
    baseReguladora: simulated.result.baseReguladora,
    quality: simulated.quality,
    notes: simulated.notes,
    isOrdinary: simulated.monthsEarly === 0,
  };
}

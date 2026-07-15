/**
 * @deprecated LEGACY — no usar. Sustituido por MIOP (`lib/optimization`) + `evaluateScenario`.
 * Mantener solo por referencia histórica; generateSystemScenarios vive en simulate.ts.
 */
import { calculatePension, type PensionInput, type PensionResult } from './pension';
import { addMonths, addYears, differenceInMonths } from 'date-fns';
import { resolveOrdinaryRetirement } from '@/lib/rules/ss-rules';

export interface Scenario {
  id: string;
  name: string;
  type: 'today' | '6m' | '1y' | 'ordinary' | 'convenio' | 'paro' | 'delayed';
  retirementDate: Date;
  retirementAge: number;
  result: PensionResult;
  totalLifetime: number; // Ingresos totales estimados
  isRecommended: boolean;
  notes: string;
}

export function generateScenarios(
  baseInput: PensionInput,
  options: {
    hasSavings?: boolean;
    isSelfEmployed?: boolean;
    monthlyConvenioCost?: number;
  } = {}
): Scenario[] {
  const { birthDate } = baseInput;
  const birth = new Date(birthDate);
  const today = new Date();
  const scenarios: Scenario[] = [];

  // 1. Jubilación HOY (si es posible)
  const ageToday = getAge(birth, today);
  if (ageToday >= 63) {
    const result = calculatePension({
      ...baseInput,
      retirementDate: today.toISOString(),
      isVoluntaryEarlyRetirement: true,
      monthsOfEarlyRetirement: differenceInMonths(
        getOrdinaryRetirementDate(baseInput),
        today
      ),
    });
    scenarios.push({
      id: 'today',
      name: 'Jubilarme hoy',
      type: 'today',
      retirementDate: today,
      retirementAge: ageToday,
      result,
      totalLifetime: result.monthlyPension * 12 * 20, // 20 años esperanza
      isRecommended: false,
      notes: 'Jubilación anticipada voluntaria con coeficientes reductores.',
    });
  }

  // 2. Esperar 6 meses
  const in6m = addMonths(today, 6);
  const result6m = calculatePension({
    ...baseInput,
    retirementDate: in6m.toISOString(),
    isVoluntaryEarlyRetirement: ageToday < 65,
    monthsOfEarlyRetirement: Math.max(0, differenceInMonths(
      getOrdinaryRetirementDate(baseInput),
      in6m
    )),
  });
  scenarios.push({
    id: '6m',
    name: 'Esperar 6 meses',
    type: '6m',
    retirementDate: in6m,
    retirementAge: getAge(birth, in6m),
    result: result6m,
    totalLifetime: result6m.monthlyPension * 12 * 19.5,
    isRecommended: false,
    notes: 'Mejora coeficiente reductor si aplica.',
  });

  // 3. Esperar 1 año
  const in1y = addYears(today, 1);
  const result1y = calculatePension({
    ...baseInput,
    retirementDate: in1y.toISOString(),
    isVoluntaryEarlyRetirement: getAge(birth, in1y) < 65,
    monthsOfEarlyRetirement: Math.max(0, differenceInMonths(
      getOrdinaryRetirementDate(baseInput),
      in1y
    )),
  });
  scenarios.push({
    id: '1y',
    name: 'Esperar 1 año',
    type: '1y',
    retirementDate: in1y,
    retirementAge: getAge(birth, in1y),
    result: result1y,
    totalLifetime: result1y.monthlyPension * 12 * 19,
    isRecommended: false,
    notes: 'Reducción significativa de coeficientes reductores.',
  });

  // 4. Edad ordinaria
  const ordinaryDate = getOrdinaryRetirementDate(baseInput);
  const resultOrdinary = calculatePension({
    ...baseInput,
    retirementDate: ordinaryDate.toISOString(),
    isVoluntaryEarlyRetirement: false,
    monthsOfEarlyRetirement: 0,
  });
  scenarios.push({
    id: 'ordinary',
    name: 'Edad ordinaria',
    type: 'ordinary',
    retirementDate: ordinaryDate,
    retirementAge: getAge(birth, ordinaryDate),
    result: resultOrdinary,
    totalLifetime: resultOrdinary.monthlyPension * 12 * 18,
    isRecommended: baseInput.totalMonthsContributed >= (38 * 12 + 6),
    notes: 'Pensión al 100% sin coeficientes reductores.',
  });

  // 5. Convenio especial
  if (options.monthlyConvenioCost) {
    const convenioDate = addYears(today, 3);
    const resultConvenio = calculatePension({
      ...baseInput,
      retirementDate: convenioDate.toISOString(),
      totalMonthsContributed: baseInput.totalMonthsContributed + 36,
    });
    const cost = options.monthlyConvenioCost * 12 * 3;
    scenarios.push({
      id: 'convenio',
      name: 'Convenio especial (3 años)',
      type: 'convenio',
      retirementDate: convenioDate,
      retirementAge: getAge(birth, convenioDate),
      result: resultConvenio,
      totalLifetime: resultConvenio.monthlyPension * 12 * 17 - cost,
      isRecommended: false,
      notes: `Coste del convenio: ${cost.toLocaleString('es-ES')} € en 3 años.`,
    });
  }

  // 6. Jubilación demorada (+2 años)
  const delayedDate = addYears(ordinaryDate, 2);
  const resultDelayed = calculatePension({
    ...baseInput,
    retirementDate: delayedDate.toISOString(),
    totalMonthsContributed: baseInput.totalMonthsContributed + 24,
  });
  // Bonus por demora: 2-4% por año adicional (simplificado: 3%)
  const delayedBonus = resultDelayed.monthlyPension * 0.06; // 2 años × 3%
  const finalDelayed = {
    ...resultDelayed,
    monthlyPension: resultDelayed.monthlyPension + delayedBonus,
    annualPension: (resultDelayed.monthlyPension + delayedBonus) * 14,
  };
  scenarios.push({
    id: 'delayed',
    name: 'Jubilación demorada (+2 años)',
    type: 'delayed',
    retirementDate: delayedDate,
    retirementAge: getAge(birth, delayedDate),
    result: finalDelayed,
    totalLifetime: finalDelayed.monthlyPension * 12 * 16,
    isRecommended: true,
    notes: 'Bonus por demora: 3% por año adicional trabajado.',
  });

  return scenarios;
}

function getOrdinaryRetirementDate(input: PensionInput): Date {
  const birth = new Date(input.birthDate);
  return resolveOrdinaryRetirement({
    birth,
    monthsContributedNow: input.totalMonthsContributed,
    assumeContinueContributing: true,
  }).date;
}

function getAge(birth: Date, date: Date): number {
  let age = date.getFullYear() - birth.getFullYear();
  const m = date.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && date.getDate() < birth.getDate())) age--;
  return age;
}
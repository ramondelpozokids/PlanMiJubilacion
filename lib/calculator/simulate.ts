/**
 * Simulador SIP — escenarios a partir del expediente (SoT).
 * Nunca lee PDFs. Solo PensionInput / ExpedienteDigital.
 */
import { addYears, differenceInMonths } from 'date-fns';
import { type PensionResult } from './pension';
import {
  getEarlyCoefficientPerQuarter,
  getActiveSsRules,
  resolveOrdinaryRetirement,
} from '@/lib/rules/ss-rules';
import { getActiveEconomicParams } from '@/lib/rules/economic';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { applyEarlyReduction, getRealPensionSnapshot } from './real-pension';
import { DEFAULT_LIFE_PATH } from './life-path';

export type ScenarioOrigin = 'system' | 'custom';

export interface ScenarioAssumptions {
  /** Nombre amigable */
  name: string;
  /** Fecha de jubilación deseada (ISO date o Date) */
  retirementDate: string | Date;
  /** Base mensual futura a proyectar hasta la jubilación (€). Si null, usa última documentada */
  futureMonthlyBase?: number | null;
  /** Meses adicionales de cotización (trabajo / paro asimilado / convenio) */
  extraMonthsContributed?: number;
  /** Meses en convenio especial (añaden cotización + coste) */
  convenioMonths?: number;
  /** Coste mensual del convenio */
  convenioMonthlyCost?: number;
  /** Meses de prestación paro antes de jubilar (asimilados a cotizados si >0) */
  paroMonths?: number;
  /** Tipo libre */
  scenarioType?: string;
}

export interface SimulatedScenario {
  id: string;
  name: string;
  type: string;
  origin: ScenarioOrigin;
  retirementDate: Date;
  retirementAge: number;
  monthsEarly: number;
  reductionPercent: number;
  result: PensionResult;
  totalLifetime: number;
  convenioCost: number;
  isRecommended: boolean;
  notes: string;
  quality: 'full' | 'partial' | 'none';
  assumptions: ScenarioAssumptions;
}

function parseBirth(birthDate: string): Date {
  const [y, m, d] = birthDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getAge(birth: Date, date: Date): number {
  let age = date.getFullYear() - birth.getFullYear();
  const m = date.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && date.getDate() < birth.getDate())) age--;
  return age;
}

function ordinaryDateFromExpediente(expediente: ExpedienteDigital, asOf: Date = new Date()): Date | null {
  const birthRaw = expediente.identificacion.fechaNacimiento?.value;
  const anos = expediente.resumen.anosCotizados?.value ?? 0;
  const meses = expediente.resumen.mesesCotizados?.value ?? 0;
  const dmy = birthRaw?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!dmy || anos * 12 + meses <= 0) return null;
  const birth = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  return resolveOrdinaryRetirement({
    birth,
    monthsContributedNow: anos * 12 + meses,
    asOf,
    assumeContinueContributing: true,
  }).date;
}

/** Genera el pack del sistema (baseline). */
export function generateSystemScenarios(
  expediente: ExpedienteDigital
): SimulatedScenario[] {
  const birthRaw = expediente.identificacion.fechaNacimiento?.value;
  const dmy = birthRaw?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!dmy) return [];
  const birth = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const today = new Date();
  const ord = ordinaryDateFromExpediente(expediente);
  if (!ord) return [];

  const defs: ScenarioAssumptions[] = [
    {
      name: 'Edad ordinaria',
      retirementDate: ord,
      scenarioType: 'ordinary',
    },
    {
      name: 'Cumplir 65',
      retirementDate: addYears(birth, 65),
      scenarioType: 'age65',
    },
  ];

  return defs
    .map((d) => simulateScenario(expediente, d, 'system'))
    .filter((s): s is SimulatedScenario => Boolean(s))
    .map((s) => (s.type === 'ordinary' ? { ...s, isRecommended: true } : s));
}

/**
 * Calcula un escenario personalizado sobre el expediente.
 * Importe: informe de bases + escenario vital (subsidio +52). Nunca simulación SS como verdad.
 */
export function simulateScenario(
  expediente: ExpedienteDigital,
  assumptions: ScenarioAssumptions,
  origin: ScenarioOrigin = 'custom'
): SimulatedScenario | null {
  const birthRaw = expediente.identificacion.fechaNacimiento?.value;
  const anos = expediente.resumen.anosCotizados?.value ?? 0;
  const meses = expediente.resumen.mesesCotizados?.value ?? 0;
  const totalMonths = anos * 12 + meses;
  if (!birthRaw || totalMonths <= 0) return null;

  const dmy = birthRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!dmy) return null;
  const birthIso = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const birth = parseBirth(birthIso);

  const retirementDate =
    typeof assumptions.retirementDate === 'string'
      ? new Date(assumptions.retirementDate)
      : assumptions.retirementDate;
  if (Number.isNaN(retirementDate.getTime())) return null;

  const today = new Date();
  const monthsUntil = Math.max(0, differenceInMonths(retirementDate, today));
  const convenioMonths = assumptions.convenioMonths ?? 0;
  const paroMonths = assumptions.paroMonths ?? 0;
  const extra =
    (assumptions.extraMonthsContributed ?? 0) + convenioMonths + paroMonths;

  const lifePath = {
    ...DEFAULT_LIFE_PATH,
    ...(assumptions.futureMonthlyBase != null && assumptions.futureMonthlyBase > 0
      ? { subsidioCotizacionBase: assumptions.futureMonthlyBase }
      : {}),
  };

  const real = getRealPensionSnapshot(expediente, {
    lifePath,
    retirementDate,
    asOf: today,
  });

  const totalAtRet = totalMonths + monthsUntil + extra;
  const ord = resolveOrdinaryRetirement({
    birth,
    monthsContributedNow: totalMonths,
    asOf: today,
    assumeContinueContributing: true,
  }).date;
  const monthsEarly = Math.max(0, differenceInMonths(ord, retirementDate));
  const yearsAtRet = totalAtRet / 12;
  const coef = getEarlyCoefficientPerQuarter(yearsAtRet);
  const quarters = monthsEarly > 0 ? Math.ceil(monthsEarly / 3) : 0;
  const reductionPercent =
    monthsEarly > 0 ? Math.min(50, Math.round(quarters * coef * 10000) / 100) : 0;

  let monthly = 0;
  let result: PensionResult;
  let quality: 'full' | 'partial' | 'none' = 'none';
  let note = real.note;

  if (real.ordinaryMonthly != null) {
    // Ya calculado a la fecha elegida; si anticipas vs ordinaria, el BR ya refleja
    // el tramo hasta esa fecha. Solo aplicamos coeficientes si monthsEarly>0 y el
    // snapshot se pidió a ordinaria… Aquí pedimos a la fecha elegida → no doble reducción.
    monthly = real.ordinaryMonthly;
    if (monthsEarly > 0) {
      // El snapshot ya usa bases hasta esa fecha; la reducción legal va aparte
      const reduced = applyEarlyReduction(monthly, monthsEarly, yearsAtRet);
      monthly = reduced.monthly;
    }
    quality =
      real.quality === 'full_bases'
        ? 'full'
        : real.quality === 'bases_plus_path'
          ? 'partial'
          : 'none';
    result = {
      baseReguladora: real.baseReguladora ?? real.ordinaryMonthly,
      percentageByYears: real.percentageByYears ?? 100,
      monthlyPension: monthly,
      annualPension: Math.round(monthly * 14 * 100) / 100,
      effectivePension: monthly,
      isCapped: false,
      maxPension2024: getActiveSsRules().maxPensionMonthly,
      disclaimer:
        real.quality === 'bases_plus_path'
          ? 'Informe de bases + proyección subsidio +52 (no simulación SS).'
          : 'Basado en bases documentadas del informe.',
    };
  } else {
    result = {
      baseReguladora: 0,
      percentageByYears: 0,
      monthlyPension: 0,
      annualPension: 0,
      effectivePension: 0,
      isCapped: false,
      maxPension2024: getActiveSsRules().maxPensionMonthly,
      disclaimer: real.note,
    };
  }

  const convenioCost = convenioMonths * (assumptions.convenioMonthlyCost ?? 0);
  const eco = getActiveEconomicParams();
  const yearsLeft = Math.max(
    10,
    eco.expectancyYearsFrom65 + 65 - getAge(birth, retirementDate)
  );
  const totalLifetime = monthly * 14 * yearsLeft - convenioCost;

  const id =
    origin === 'custom'
      ? `custom-${Date.now().toString(36)}`
      : assumptions.scenarioType ?? 'scenario';

  return {
    id,
    name: assumptions.name,
    type: assumptions.scenarioType ?? (origin === 'custom' ? 'custom' : 'system'),
    origin,
    retirementDate,
    retirementAge: getAge(birth, retirementDate),
    monthsEarly,
    reductionPercent,
    result,
    totalLifetime,
    convenioCost,
    isRecommended: monthsEarly === 0 && convenioMonths === 0,
    notes: [
      note,
      monthsEarly > 0 ? `Reducción anticipada ≈ ${reductionPercent}%` : 'Sin reducción por anticipación',
      convenioMonths > 0
        ? `Convenio ${convenioMonths} meses · coste ${convenioCost.toLocaleString('es-ES')} €`
        : null,
      paroMonths > 0 ? `${paroMonths} meses paro asimilados` : null,
    ]
      .filter(Boolean)
      .join('. '),
    quality,
    assumptions,
  };
}

/**
 * Simulación a fecha elegida + comparativa — capa fina sobre el motor SIP
 * y el motor oficial de anticipada (tablas BOE).
 */
import { addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { buildRetirementOutlook } from '@/lib/calculator/retirement-outlook';
import { simulateScenario } from '@/lib/calculator/simulate';
import { resolveOrdinaryRetirement } from '@/lib/rules/ss-rules';
import {
  computeAnticipation,
  resolveEarlyRetirement,
  type EarlyRetirementResolution,
} from '@/lib/rules/early-retirement';
import { getActiveSsRules } from '@/lib/rules/ss-rules';

export type JubilationModality =
  | 'ordinary'
  | 'early_voluntary'
  | 'early_involuntary'
  | 'early_involuntary_pending'
  | 'not_eligible'
  | 'deferred';

export interface DateSimulationRow {
  label: string;
  retirementDate: Date;
  retirementDateLabel: string;
  modality: JubilationModality;
  modalityLabel: string;
  age: number;
  monthsEarly: number;
  reductionPercent: number;
  monthlyPension: number | null;
  annualPension: number | null;
  baseReguladora: number | null;
  percentageByYears: number | null;
  notes: string;
  /** Transparencia del cálculo oficial. */
  calculation?: EarlyRetirementResolution & {
    ordinaryDateLabel: string;
    chosenDateLabel: string;
    finalMonthly: number | null;
    ordinaryMonthlyBeforeReduction: number | null;
  };
}

function parseBirth(expediente: ExpedienteDigital): Date | null {
  const raw = expediente.identificacion.fechaNacimiento?.value;
  if (!raw) return null;
  const dmy = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return null;
}

function monthsContributed(expediente: ExpedienteDigital): number {
  const y = expediente.resumen.anosCotizados?.value ?? 0;
  const m = expediente.resumen.mesesCotizados?.value ?? 0;
  return y * 12 + m;
}

function mapModality(
  resolution: EarlyRetirementResolution
): { modality: JubilationModality; label: string } {
  switch (resolution.modality) {
    case 'ordinary':
      return { modality: 'ordinary', label: resolution.modalityLabel };
    case 'deferred':
      return { modality: 'deferred', label: resolution.modalityLabel };
    case 'voluntary':
      return { modality: 'early_voluntary', label: resolution.modalityLabel };
    case 'involuntary':
      return {
        modality: resolution.notes.some((n) => n.includes('pendiente acreditar'))
          ? 'early_involuntary_pending'
          : 'early_involuntary',
        label: resolution.modalityLabel,
      };
    case 'not_eligible':
      return { modality: 'not_eligible', label: resolution.modalityLabel };
  }
}

export function buildDateSimulation(
  expediente: ExpedienteDigital,
  retirementDate: Date,
  opts?: { declareInvoluntaryCause?: boolean }
): DateSimulationRow | null {
  const birth = parseBirth(expediente);
  const monthsNow = monthsContributed(expediente);
  if (!birth || monthsNow <= 0) return null;

  const today = new Date();
  const ordinary = resolveOrdinaryRetirement({
    birth,
    monthsContributedNow: monthsNow,
    asOf: today,
    assumeContinueContributing: true,
  }).date;

  const sim = simulateScenario(
    expediente,
    {
      name: 'Fecha elegida',
      retirementDate,
      scenarioType: 'custom',
    },
    'custom'
  );
  if (!sim) return null;

  const monthsUntil = Math.max(
    0,
    Math.round((retirementDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.4375))
  );
  const monthsAtRet = monthsNow + monthsUntil;
  const anticipation = computeAnticipation(ordinary, retirementDate);
  const rules = getActiveSsRules();

  // Transparencia: misma resolución oficial que usa el motor (sin reaplicar sobre la pensión ya reducida)
  const resolution = resolveEarlyRetirement({
    ordinaryDate: ordinary,
    chosenDate: retirementDate,
    birthDate: birth,
    completeContributionMonthsAtChosen: Math.floor(monthsAtRet),
    declareInvoluntaryCause: opts?.declareInvoluntaryCause,
    rulesYear: retirementDate.getFullYear(),
    // Si la pensión simulada ya está cerca/sobre el tope, DT34 puede aplicar
    theoreticalMonthlyExceedsMax:
      (sim.result.monthlyPension ?? 0) >= rules.maxPensionMonthly * 0.98,
  });

  const mapped = mapModality(resolution);
  const reductionPercent =
    resolution.coefficient?.reductionPercent ?? sim.reductionPercent;

  // Pensión: la de simulateScenario (ya aplica tablas oficiales)
  const monthlyPension = sim.result.monthlyPension || null;
  const ordinaryBefore =
    monthlyPension != null && reductionPercent > 0
      ? Math.round((monthlyPension / (1 - reductionPercent / 100)) * 100) / 100
      : monthlyPension;

  return {
    label: 'Fecha seleccionada',
    retirementDate,
    retirementDateLabel: format(retirementDate, 'd MMMM yyyy', { locale: es }),
    modality: mapped.modality,
    modalityLabel: mapped.label,
    age: sim.retirementAge,
    monthsEarly: anticipation.monthsEarly,
    reductionPercent,
    monthlyPension,
    annualPension: sim.result.annualPension || null,
    baseReguladora: sim.result.baseReguladora || null,
    percentageByYears: sim.result.percentageByYears || null,
    notes: resolution.notes.join(' ') || sim.notes,
    calculation: {
      ...resolution,
      ordinaryDateLabel: format(ordinary, 'd MMMM yyyy', { locale: es }),
      chosenDateLabel: format(retirementDate, 'd MMMM yyyy', { locale: es }),
      finalMonthly: monthlyPension,
      ordinaryMonthlyBeforeReduction: ordinaryBefore,
    },
  };
}

export function buildComparisonTable(
  expediente: ExpedienteDigital
): DateSimulationRow[] {
  const birth = parseBirth(expediente);
  const monthsNow = monthsContributed(expediente);
  if (!birth || monthsNow <= 0) return [];

  const today = new Date();
  const ordinary = resolveOrdinaryRetirement({
    birth,
    monthsContributedNow: monthsNow,
    asOf: today,
    assumeContinueContributing: true,
  }).date;

  const offsets = [
    { months: 0, label: 'Ordinaria' },
    { months: -6, label: '6 meses antes' },
    { months: -12, label: '12 meses antes' },
    { months: -24, label: '24 meses antes' },
  ];

  const rows: DateSimulationRow[] = [];
  for (const o of offsets) {
    const date = addMonths(ordinary, o.months);
    if (date < today) continue;
    const row = buildDateSimulation(expediente, date);
    if (row) rows.push({ ...row, label: o.label });
  }
  return rows;
}

export function personalStatsFromBirth(birthIso: string, asOf = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthIso)) return null;
  const [y, m, d] = birthIso.split('-').map(Number);
  const birth = new Date(y, m - 1, d);
  if (Number.isNaN(birth.getTime())) return null;

  let age = asOf.getFullYear() - birth.getFullYear();
  const md = asOf.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && asOf.getDate() < birth.getDate())) age--;

  const ordinaryAgeHint = 66;
  const ordinaryHint = new Date(birth);
  ordinaryHint.setFullYear(birth.getFullYear() + ordinaryAgeHint);
  const anticipation = computeAnticipation(ordinaryHint, asOf);
  const monthsLeft = anticipation.monthsEarly;

  return {
    ageYears: age,
    ordinaryAgeHint,
    ordinaryHintDate: ordinaryHint,
    monthsUntilOrdinaryHint: monthsLeft,
    yearsUntilOrdinaryHint: Math.floor(monthsLeft / 12),
    monthsRemainderHint: monthsLeft % 12,
  };
}

export function getOutlookSafe(expediente: ExpedienteDigital) {
  try {
    return buildRetirementOutlook(expediente);
  } catch {
    return null;
  }
}

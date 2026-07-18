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
import type { LifePathAssumptions } from '@/lib/calculator/life-path';
import { FOUNDER_LIFE_PATH } from '@/lib/calculator/life-path';

/** Pagas anuales de la pensión contributiva de jubilación (SS). */
export const PENSION_ANNUAL_PAYMENTS = 14;

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
  /** Bruto anual = mensual × 14 pagas */
  annualPension: number | null;
  annualPayments: number;
  baseReguladora: number | null;
  percentageByYears: number | null;
  /** Retención IRPF aplicada (0–1) */
  irpfRetention: number;
  irpfMonthly: number | null;
  netMonthly: number | null;
  netAnnual: number | null;
  notes: string;
  /** Transparencia del cálculo oficial. */
  calculation?: EarlyRetirementResolution & {
    ordinaryDateLabel: string;
    chosenDateLabel: string;
    finalMonthly: number | null;
    ordinaryMonthlyBeforeReduction: number | null;
  };
}

export interface BuildDateSimulationOptions {
  declareInvoluntaryCause?: boolean;
  /** Escenario vital del caso de asesoría (no el del fundador). */
  lifePath?: LifePathAssumptions;
  /** Retención IRPF 0–1 (p. ej. 0.15 = 15 %). Orientativa. */
  irpfRetention?: number;
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function applyIrpf(
  monthly: number | null,
  retention: number
): { irpfMonthly: number | null; netMonthly: number | null; netAnnual: number | null } {
  if (monthly == null) return { irpfMonthly: null, netMonthly: null, netAnnual: null };
  const r = Math.min(0.5, Math.max(0, retention));
  const irpfMonthly = round2(monthly * r);
  const netMonthly = round2(monthly - irpfMonthly);
  return {
    irpfMonthly,
    netMonthly,
    netAnnual: round2(netMonthly * PENSION_ANNUAL_PAYMENTS),
  };
}

export function buildDateSimulation(
  expediente: ExpedienteDigital,
  retirementDate: Date,
  opts?: BuildDateSimulationOptions
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

  const irpfRetention = Math.min(0.5, Math.max(0, opts?.irpfRetention ?? 0));

  const sim = simulateScenario(
    expediente,
    {
      name: 'Fecha elegida',
      retirementDate,
      scenarioType: 'custom',
      lifePath: opts?.lifePath,
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

  const resolution = resolveEarlyRetirement({
    ordinaryDate: ordinary,
    chosenDate: retirementDate,
    birthDate: birth,
    completeContributionMonthsAtChosen: Math.floor(monthsAtRet),
    declareInvoluntaryCause: opts?.declareInvoluntaryCause,
    rulesYear: retirementDate.getFullYear(),
    theoreticalMonthlyExceedsMax:
      (sim.result.monthlyPension ?? 0) >= rules.maxPensionMonthly * 0.98,
  });

  const mapped = mapModality(resolution);
  const reductionPercent =
    resolution.coefficient?.reductionPercent ?? sim.reductionPercent;

  const monthlyPension = sim.result.monthlyPension || null;
  const ordinaryBefore =
    monthlyPension != null && reductionPercent > 0
      ? round2(monthlyPension / (1 - reductionPercent / 100))
      : monthlyPension;

  const annualPension =
    monthlyPension != null
      ? round2(monthlyPension * PENSION_ANNUAL_PAYMENTS)
      : null;
  const irpf = applyIrpf(monthlyPension, irpfRetention);

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
    annualPension,
    annualPayments: PENSION_ANNUAL_PAYMENTS,
    baseReguladora: sim.result.baseReguladora || null,
    percentageByYears: sim.result.percentageByYears || null,
    irpfRetention,
    irpfMonthly: irpf.irpfMonthly,
    netMonthly: irpf.netMonthly,
    netAnnual: irpf.netAnnual,
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
  expediente: ExpedienteDigital,
  opts?: BuildDateSimulationOptions
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
    const row = buildDateSimulation(expediente, date, opts);
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
    return buildRetirementOutlook(expediente, new Date(), FOUNDER_LIFE_PATH);
  } catch {
    return null;
  }
}

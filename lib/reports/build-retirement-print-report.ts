/**
 * Datos para informe imprimible de jubilación (PDF vía window.print).
 */
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import type { LifePathAssumptions } from '@/lib/calculator/life-path';
import { DEFAULT_LIFE_PATH, describeLifePathTramos } from '@/lib/calculator/life-path';
import { buildRetirementOutlook } from '@/lib/calculator/retirement-outlook';
import {
  buildDateSimulation,
  PENSION_ANNUAL_PAYMENTS,
} from '@/lib/asesoria-wizard/simulate-at-date';
import { getOfficialSimulation } from '@/lib/calculator/real-pension';
import { DEFAULT_ISSUER } from '@/lib/billing/documents';

export interface RetirementPrintIrpfRow {
  retentionPct: number;
  irpfMonthly: number;
  netMonthly: number;
  netAnnual: number;
}

export interface RetirementPrintReport {
  reportNumber: string;
  issuedAtLabel: string;
  verificationId: string;
  clientName: string;
  clientDni: string | null;
  clientBirth: string | null;
  issuer: typeof DEFAULT_ISSUER;
  retirementDateLabel: string;
  retirementAgeLabel: string;
  modalityLabel: string;
  annualPayments: number;
  /** Escenario real (informe bases + life path) */
  real: {
    monthlyBruto: number | null;
    annualBruto: number | null;
    baseReguladora: number | null;
    percentageByYears: number | null;
    reductionPercent: number;
    irpfRows: RetirementPrintIrpfRow[];
  };
  /** Referencia simulación oficial SS (si existe en expediente) */
  officialSs: {
    monthlyBruto: number | null;
    annualBruto: number | null;
    dateLabel: string | null;
    note: string;
  };
  lifePathTramos: { paro: string | null; subsidio: string | null };
  disclaimer: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function irpfRows(monthly: number | null, presets: number[]): RetirementPrintIrpfRow[] {
  if (monthly == null) return [];
  return presets.map((pct) => {
    const r = pct / 100;
    const irpfMonthly = round2(monthly * r);
    const netMonthly = round2(monthly - irpfMonthly);
    return {
      retentionPct: pct,
      irpfMonthly,
      netMonthly,
      netAnnual: round2(netMonthly * PENSION_ANNUAL_PAYMENTS),
    };
  });
}

export function buildRetirementPrintReport(
  expediente: ExpedienteDigital,
  options: {
    clientName?: string;
    lifePath?: LifePathAssumptions;
    asOf?: Date;
    irpfPresets?: number[];
  } = {}
): RetirementPrintReport | null {
  const lifePath = options.lifePath ?? DEFAULT_LIFE_PATH;
  const asOf = options.asOf ?? new Date();
  const outlook = buildRetirementOutlook(expediente, asOf, lifePath);
  if (!outlook) return null;

  const ordinaryDate = outlook.ordinary.date;
  const sim = buildDateSimulation(expediente, ordinaryDate, {
    lifePath,
    irpfRetention: 0,
  });
  const official = getOfficialSimulation(expediente);
  const monthly = sim?.monthlyPension ?? outlook.pension.ordinaryResult?.monthlyPension ?? null;
  const presets = options.irpfPresets ?? [0, 15, 19];

  const name =
    options.clientName?.trim() ||
    expediente.identificacion.nombre?.value ||
    'Titular';

  const y = asOf.getFullYear();
  const seq = `${asOf.getMonth() + 1}${String(asOf.getDate()).padStart(2, '0')}`;
  const reportNumber = `INF-JUB-${y}-${seq}-${name
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase()}`;

  return {
    reportNumber,
    issuedAtLabel: format(asOf, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es }),
    verificationId: crypto.randomUUID(),
    clientName: name,
    clientDni: expediente.identificacion.dni?.value ?? null,
    clientBirth: expediente.identificacion.fechaNacimiento?.value ?? null,
    issuer: DEFAULT_ISSUER,
    retirementDateLabel: outlook.ordinary.dateLabel,
    retirementAgeLabel: outlook.ordinary.ageLabel,
    modalityLabel: sim?.modalityLabel ?? 'Jubilación ordinaria',
    annualPayments: PENSION_ANNUAL_PAYMENTS,
    real: {
      monthlyBruto: monthly,
      annualBruto:
        monthly != null ? round2(monthly * PENSION_ANNUAL_PAYMENTS) : null,
      baseReguladora:
        sim?.baseReguladora ?? outlook.pension.ordinaryResult?.baseReguladora ?? null,
      percentageByYears:
        sim?.percentageByYears ?? outlook.pension.ordinaryResult?.percentageByYears ?? null,
      reductionPercent: sim?.reductionPercent ?? 0,
      irpfRows: irpfRows(monthly, presets),
    },
    officialSs: {
      monthlyBruto: official?.pensionMensual ?? null,
      annualBruto:
        official?.pensionMensual != null
          ? round2(official.pensionMensual * PENSION_ANNUAL_PAYMENTS)
          : null,
      dateLabel: official?.fechaJubilacion ?? null,
      note:
        'Referencia de la simulación oficial SS (hipótesis de empleo continuo). No es el escenario vital del expediente.',
    },
    lifePathTramos: describeLifePathTramos(lifePath),
    disclaimer:
      'Informe orientativo de PlanMiJubilación. No sustituye resoluciones del INSS ni el cálculo oficial de la Seguridad Social. El IRPF es estimativo; la retención real la fija la AEAT.',
  };
}

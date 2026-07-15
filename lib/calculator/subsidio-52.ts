/**
 * Motor subsidio mayores de 52: lee config oficial del año y calcula
 * bruto, neto, base cotización, costes e impacto en pensión.
 */
import { differenceInMonths } from 'date-fns';
import {
  deriveSubsidio52Amounts,
  getSubsidio52Config,
  type Subsidio52YearConfig,
} from '@/lib/rules/subsidio-52';
import type { LifePathAssumptions } from './life-path';
import { parseYearMonth } from './life-path';

export interface Subsidio52MonthBreakdown {
  year: number;
  month: number; // 1–12
  periodKey: string;
  bruto: number;
  neto: number;
  irpf: number;
  baseCotizacion: number;
  configStatus: 'official' | 'provisional';
}

export interface Subsidio52Projection {
  /** Año de referencia de la ficha (p.ej. 2027) */
  referenceYear: number;
  config: Subsidio52YearConfig;
  /** Importes del año de referencia */
  monthly: {
    bruto: number;
    neto: number;
    irpf: number;
    baseCotizacion: number;
    rentLimit: number;
  };
  annual: {
    bruto: number;
    neto: number;
    irpf: number;
    /** Suma bases de cotización en 12 meses (lo que nutre la BR) */
    baseCotizacion: number;
  };
  /** Desde inicio subsidio hasta fecha jubilación */
  untilRetirement: {
    months: number;
    totalBruto: number;
    totalNeto: number;
    totalIrpf: number;
    totalBaseCotizacion: number;
    /** Desglose mes a mes (puede ser largo; UI puede resumir) */
    monthsDetail: Subsidio52MonthBreakdown[];
  };
  legal: {
    status: 'official' | 'provisional';
    sources: string[];
    notes: string;
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function periodKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * Calcula proyección del subsidio +52 desde `fromYm` (YYYY-MM) hasta el mes
 * anterior a `retirementDate` (hecho causante).
 */
export function projectSubsidio52(options: {
  referenceYear?: number;
  fromYm: string;
  retirementDate: Date;
  /** Override retención IRPF (0–1) */
  irpfRetentionRate?: number;
}): Subsidio52Projection {
  const referenceYear = options.referenceYear ?? 2027;
  let config = getSubsidio52Config(referenceYear);
  if (options.irpfRetentionRate != null) {
    config = { ...config, irpfRetentionRate: options.irpfRetentionRate };
  }

  const derived = deriveSubsidio52Amounts(config);
  const start = parseYearMonth(options.fromYm);
  if (!start) {
    throw new Error(`fromYm inválido: ${options.fromYm}`);
  }

  // Último mes cotizado antes del hecho causante
  const end = new Date(
    options.retirementDate.getFullYear(),
    options.retirementDate.getMonth() - 1,
    1
  );

  const monthsDetail: Subsidio52MonthBreakdown[] = [];
  let y = start.year;
  let m = start.month;
  const endKey = end.getFullYear() * 12 + (end.getMonth() + 1);

  while (y * 12 + m <= endKey) {
    const yearCfg = getSubsidio52Config(y);
    const d =
      options.irpfRetentionRate != null
        ? deriveSubsidio52Amounts({
            ...yearCfg,
            irpfRetentionRate: options.irpfRetentionRate,
          })
        : deriveSubsidio52Amounts(yearCfg);

    monthsDetail.push({
      year: y,
      month: m,
      periodKey: periodKey(y, m),
      bruto: d.subsidioBruto,
      neto: d.subsidioNeto,
      irpf: d.irpfMonthly,
      baseCotizacion: d.baseCotizacion,
      configStatus: yearCfg.status,
    });

    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  const sum = (fn: (row: Subsidio52MonthBreakdown) => number) =>
    round2(monthsDetail.reduce((a, row) => a + fn(row), 0));

  return {
    referenceYear,
    config,
    monthly: {
      bruto: derived.subsidioBruto,
      neto: derived.subsidioNeto,
      irpf: derived.irpfMonthly,
      baseCotizacion: derived.baseCotizacion,
      rentLimit: derived.rentLimitMonthly,
    },
    annual: {
      bruto: round2(derived.subsidioBruto * 12),
      neto: round2(derived.subsidioNeto * 12),
      irpf: round2(derived.irpfMonthly * 12),
      baseCotizacion: round2(derived.baseCotizacion * 12),
    },
    untilRetirement: {
      months: monthsDetail.length,
      totalBruto: sum((r) => r.bruto),
      totalNeto: sum((r) => r.neto),
      totalIrpf: sum((r) => r.irpf),
      totalBaseCotizacion: sum((r) => r.baseCotizacion),
      monthsDetail,
    },
    legal: {
      status: config.status,
      sources: config.sources,
      notes: config.notes,
    },
  };
}

/** Años cotizando con subsidio desde life-path hasta una fecha. */
export function monthsOnSubsidioUntil(
  lifePath: LifePathAssumptions,
  until: Date
): number {
  const start = parseYearMonth(lifePath.subsidioMayores52From);
  if (!start) return 0;
  const startDate = new Date(start.year, start.month - 1, 1);
  if (until <= startDate) return 0;
  return Math.max(0, differenceInMonths(until, startDate));
}

/**
 * Impacto en pensión: diferencia (tu escenario con subsidio) − (congelar sin cotizar).
 * Los importes de pensión se pasan ya calculados por el motor principal.
 */
export function pensionImpactFromSubsidio(options: {
  pensionWithSubsidioPath: number | null;
  pensionIfFreeze: number | null;
  officialSimReference: number | null;
}): {
  vsFreezeMonthly: number | null;
  vsOfficialSimMonthly: number | null;
  note: string;
} {
  const { pensionWithSubsidioPath, pensionIfFreeze, officialSimReference } = options;
  const vsFreezeMonthly =
    pensionWithSubsidioPath != null && pensionIfFreeze != null
      ? round2(pensionWithSubsidioPath - pensionIfFreeze)
      : null;
  const vsOfficialSimMonthly =
    pensionWithSubsidioPath != null && officialSimReference != null
      ? round2(pensionWithSubsidioPath - officialSimReference)
      : null;

  return {
    vsFreezeMonthly,
    vsOfficialSimMonthly,
    note:
      'Tu escenario = informe de bases + cotización al 125 % base mínima mientras cobras el subsidio. ' +
      'La simulación SS asume empleo continuo (referencia, no tu caso).',
  };
}

/** Life-path por defecto alineado con config oficial del año de inicio. */
export function lifePathFromSubsidioConfig(
  fromYm: string,
  year?: number
): LifePathAssumptions {
  const y = year ?? parseYearMonth(fromYm)?.year ?? 2027;
  const cfg = getSubsidio52Config(y);
  const { baseCotizacion } = deriveSubsidio52Amounts(cfg);
  return {
    currentlyUnemployed: true,
    subsidioMayores52From: fromYm,
    subsidioCotizacionBase: baseCotizacion,
    desempleoBaseAntesSubsidio: 0,
  };
}

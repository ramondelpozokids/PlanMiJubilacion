/**
 * Pensión a partir del INFORME DE BASES (presente) + proyección futura del escenario vital.
 * La simulación oficial SS es solo referencia (hipótesis empleo continuo) — no prevalece.
 */
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { getActiveSsRules, resolveOrdinaryRetirement } from '@/lib/rules/ss-rules';
import {
  applyOfficialEarlyReduction,
  type ApplyOfficialEarlyReductionResult,
  type ResolveEarlyRetirementInput,
} from '@/lib/rules/early-retirement';
import { listDocumentedBases } from './from-expediente';
import { calculatePension } from './pension';
import {
  DEFAULT_LIFE_PATH,
  periodKey,
  projectedBaseForMonth,
  type LifePathAssumptions,
} from './life-path';

export interface OfficialSimulationData {
  pensionMensual: number;
  baseReguladora: number | null;
  porcentaje: number | null;
  edadJubilacion: number | null;
  fechaJubilacion: string | null;
  sourceLabel: string;
}

/** Simulación SS: hipótesis de empleo continuo — no es el escenario del usuario desempleado. */
export function getOfficialSimulation(
  expediente: ExpedienteDigital
): OfficialSimulationData | null {
  for (const r of expediente.resoluciones) {
    const tipo = (r.tipo?.value ?? '').toLowerCase();
    const resumen = (r.resumen?.value ?? '').toLowerCase();
    const isSim =
      tipo.includes('simulacion') ||
      tipo.includes('simulación') ||
      resumen.includes('simulación oficial') ||
      resumen.includes('simulacion oficial');
    if (isSim && r.importe?.value != null && r.importe.value > 0) {
      return {
        pensionMensual: Number(r.importe.value),
        baseReguladora: null,
        porcentaje: null,
        edadJubilacion: null,
        fechaJubilacion: r.fecha?.value ?? null,
        sourceLabel: r.sources[0]?.documentName ?? 'Simulación SS',
      };
    }
  }
  return null;
}

export type RealPensionQuality =
  | 'bases_plus_path' // bases documentadas + proyección subsidio/desempleo
  | 'full_bases' // 300 bases ya documentadas hasta el cálculo
  | 'none';

export interface RealPensionSnapshot {
  quality: RealPensionQuality;
  ordinaryMonthly: number | null;
  baseReguladora: number | null;
  percentageByYears: number | null;
  basesDocumentadas: number;
  basesRequeridas: number;
  sourceLabel: string | null;
  note: string;
  /** Referencia SS (no usada como verdad del usuario) */
  officialSimReference: OfficialSimulationData | null;
  lifePath: LifePathAssumptions;
}

function birthIsoFromExpediente(expediente: ExpedienteDigital): string {
  const birth = expediente.identificacion.fechaNacimiento?.value;
  if (birth) {
    const m = birth.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return '1960-01-01';
}

/**
 * Construye hasta 300 bases: pasado = informe documental;
 * futuro = escenario vital (desempleo → subsidio +52). Nunca media inventada del pasado.
 */
export function buildBasesSeries(
  expediente: ExpedienteDigital,
  retirementDate: Date,
  lifePath: LifePathAssumptions = DEFAULT_LIFE_PATH,
  asOf: Date = new Date()
): { bases: number[]; documentedUsed: number; projectedUsed: number; note: string } {
  const rules = getActiveSsRules();
  const documented = listDocumentedBases(expediente);
  const byKey = new Map(documented.map((b) => [b.periodKey, b.base]));

  // Mes anterior al hecho causante (regla BR)
  const end = new Date(retirementDate.getFullYear(), retirementDate.getMonth() - 1, 1);
  const bases: number[] = [];
  let documentedUsed = 0;
  let projectedUsed = 0;

  for (let i = rules.monthsForBaseReguladora - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = periodKey(y, m);
    const doc = byKey.get(key);
    if (doc != null) {
      bases.push(doc);
      documentedUsed++;
      continue;
    }
    // Futuro (o hueco no documentado tras asOf): proyección del escenario vital
    const asOfKey = asOf.getFullYear() * 12 + (asOf.getMonth() + 1);
    const thisKey = y * 12 + m;
    if (thisKey > asOfKey) {
      const proj = projectedBaseForMonth(y, m, lifePath, asOf);
      bases.push(proj);
      projectedUsed++;
    } else {
      // Hueco en el pasado documental: 0 (no inventar media)
      bases.push(0);
    }
  }

  return {
    bases,
    documentedUsed,
    projectedUsed,
    note:
      documentedUsed === 0
        ? 'Sin bases documentadas del informe. Relee el Informe Integral de Bases.'
        : `Pasado: ${documentedUsed} meses del informe de bases. Futuro: ${projectedUsed} meses con escenario desempleo → subsidio +52 (base oficial 125 % mínima por año, desde ${lifePath.subsidioMayores52From}).`,
  };
}

export function getRealPensionSnapshot(
  expediente: ExpedienteDigital,
  options: {
    lifePath?: LifePathAssumptions;
    retirementDate?: Date;
    asOf?: Date;
  } = {}
): RealPensionSnapshot {
  const rules = getActiveSsRules();
  const lifePath = options.lifePath ?? DEFAULT_LIFE_PATH;
  const asOf = options.asOf ?? new Date();
  const documented = listDocumentedBases(expediente);
  const officialSimReference = getOfficialSimulation(expediente);

  const anos = expediente.resumen.anosCotizados?.value ?? 0;
  const meses = expediente.resumen.mesesCotizados?.value ?? 0;
  const totalMonths = anos * 12 + meses;

  const birthIso = birthIsoFromExpediente(expediente);
  const [by, bm, bd] = birthIso.split('-').map(Number);
  const birth = new Date(by, bm - 1, bd);

  // Fecha ordinaria: el subsidio +52 también cotiza → proyectamos carrera
  const retirementDate =
    options.retirementDate ??
    resolveOrdinaryRetirement({
      birth,
      monthsContributedNow: totalMonths,
      asOf,
      assumeContinueContributing: true,
    }).date;

  if (documented.length === 0) {
    return {
      quality: 'none',
      ordinaryMonthly: null,
      baseReguladora: null,
      percentageByYears: null,
      basesDocumentadas: 0,
      basesRequeridas: rules.monthsForBaseReguladora,
      sourceLabel: null,
      note: 'El presente está en el Informe de Bases. Relee ese PDF. La simulación SS (empleo continuo) no se usa como verdad.',
      officialSimReference,
      lifePath,
    };
  }

  // Con pocas bases documentadas no calculamos: haría falta inventar el pasado
  if (documented.length < 24) {
    return {
      quality: 'none',
      ordinaryMonthly: null,
      baseReguladora: null,
      percentageByYears: null,
      basesDocumentadas: documented.length,
      basesRequeridas: rules.monthsForBaseReguladora,
      sourceLabel: null,
      note: `Solo ${documented.length} bases documentadas. Relee el Informe Integral completo (cientos de meses). No usamos la simulación SS ni medias inventadas.`,
      officialSimReference,
      lifePath,
    };
  }

  const series = buildBasesSeries(expediente, retirementDate, lifePath, asOf);
  const nonZero = series.bases.filter((b) => b > 0).length;
  if (series.documentedUsed < 12 || nonZero < 24) {
    return {
      quality: 'none',
      ordinaryMonthly: null,
      baseReguladora: null,
      percentageByYears: null,
      basesDocumentadas: documented.length,
      basesRequeridas: rules.monthsForBaseReguladora,
      sourceLabel: null,
      note: series.note + ' Aún no hay meses suficientes del informe en la ventana de base reguladora.',
      officialSimReference,
      lifePath,
    };
  }

  const monthsUntil = Math.max(
    0,
    (retirementDate.getFullYear() - asOf.getFullYear()) * 12 +
      (retirementDate.getMonth() - asOf.getMonth())
  );

  const result = calculatePension({
    birthDate: birthIso,
    retirementDate: retirementDate.toISOString().slice(0, 10),
    basesLast300Months: series.bases,
    totalMonthsContributed: totalMonths + monthsUntil,
    monthsOfEarlyRetirement: 0,
  });

  const quality: RealPensionQuality =
    series.projectedUsed === 0 ? 'full_bases' : 'bases_plus_path';

  return {
    quality,
    ordinaryMonthly: result.monthlyPension,
    baseReguladora: result.baseReguladora,
    percentageByYears: result.percentageByYears,
    basesDocumentadas: documented.length,
    basesRequeridas: rules.monthsForBaseReguladora,
    sourceLabel: 'Informe de bases + escenario subsidio +52',
    note: `${series.note} No usamos la simulación SS (asume empleo continuo; tú estás en desempleo → subsidio +52).`,
    officialSimReference,
    lifePath,
  };
}

/**
 * Aplica coeficiente reductor oficial (tabla BOE).
 * Preferir pasar fechas (ordinary/chosen/birth) para «mes o fracción de mes».
 */
export function applyEarlyReduction(
  ordinaryMonthly: number,
  monthsEarly: number,
  yearsContributedAtRet: number,
  options?: Partial<
    Omit<ResolveEarlyRetirementInput, 'completeContributionMonthsAtChosen'>
  > & {
    maxPensionMonthly?: number;
  }
): { monthly: number; reductionPercent: number; detail?: ApplyOfficialEarlyReductionResult } {
  if (monthsEarly <= 0 && !options?.chosenDate) {
    return { monthly: ordinaryMonthly, reductionPercent: 0 };
  }

  const completeMonths = Math.floor(yearsContributedAtRet * 12);
  const rules = getActiveSsRules();
  const maxPension = options?.maxPensionMonthly ?? rules.maxPensionMonthly;

  // Fechas: si no se pasan, sintetizamos un adelanto exacto de N meses
  const chosenDate = options?.chosenDate ?? new Date();
  const ordinaryDate =
    options?.ordinaryDate ??
    new Date(
      chosenDate.getFullYear(),
      chosenDate.getMonth() + Math.max(0, monthsEarly),
      chosenDate.getDate()
    );
  const birthDate =
    options?.birthDate ??
    new Date(chosenDate.getFullYear() - 65, chosenDate.getMonth(), chosenDate.getDate());

  const exceedsMax = ordinaryMonthly > maxPension;
  const result = applyOfficialEarlyReduction(
    ordinaryMonthly,
    {
      ordinaryDate,
      chosenDate,
      birthDate,
      completeContributionMonthsAtChosen: completeMonths,
      declareInvoluntaryCause: options?.declareInvoluntaryCause,
      applyInvoluntaryCoefficientsViaSubsidy208_3:
        options?.applyInvoluntaryCoefficientsViaSubsidy208_3,
      rulesYear: options?.rulesYear ?? chosenDate.getFullYear(),
      theoreticalMonthlyExceedsMax:
        options?.theoreticalMonthlyExceedsMax ?? exceedsMax,
    },
    maxPension
  );

  return {
    monthly: result.monthly,
    reductionPercent: result.reductionPercent,
    detail: result,
  };
}

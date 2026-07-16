/**
 * Outlook de jubilación — presente = informe de bases;
 * futuro = escenario vital (desempleo → subsidio +52).
 * La simulación SS oficial es solo referencia (empleo continuo).
 */
import { addMonths, addYears, differenceInMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import {
  formatAgeYearsMonths,
  getActiveSsRules,
  getEarlyCoefficientPerQuarter,
  monthsToYearsMonths,
  resolveOrdinaryRetirement,
} from '@/lib/rules/ss-rules';
import type { PensionResult } from './pension';
import {
  applyEarlyReduction,
  getRealPensionSnapshot,
  type OfficialSimulationData,
  type RealPensionQuality,
} from './real-pension';
import { DEFAULT_LIFE_PATH, type LifePathAssumptions, isSubsidio52Active } from './life-path';
import {
  buildSubsidio52ErpPipeline,
  type Subsidio52ErpPipeline,
} from './subsidio-52-pipeline';
import { pensionImpactFromSubsidio } from './subsidio-52';
import type { Subsidio52Projection } from './subsidio-52';

export interface EarlyScenario {
  label: string;
  retirementAge: number;
  retirementDate: Date;
  monthsEarly: number;
  quartersEarly: number;
  reductionPercent: number;
  coefficientPerQuarterPercent: number;
  estimatedMonthly: number | null;
}

export interface RetirementOutlook {
  asOf: string;
  birthDate: string;
  ageToday: number;
  ageTodayLabel: string;
  totalMonthsContributed: number;
  carrera: { years: number; months: number };
  ordinary: {
    ageYears: number;
    ageLabel: string;
    date: Date;
    dateLabel: string;
    at65IfCareer: boolean;
    monthsMissingForAge65: number;
    monthsProjectedAtRetirement: number;
    assumption: 'continue' | 'freeze';
    explanation: string;
  };
  ordinaryIfFreeze: {
    ageYears: number;
    ageLabel: string;
    dateLabel: string;
    at65IfCareer: boolean;
  } | null;
  earlyVoluntary: {
    minAge: number;
    minYearsRequired: number;
    monthsMissingFor35: number;
    earliestEligibleDate: Date | null;
    earliestEligibleLabel: string | null;
    canRetireEarlyWhenReady: boolean;
    scenarios: EarlyScenario[];
  };
  pension: {
    quality: RealPensionQuality;
    basesDocumentadas: number;
    basesRequeridas: number;
    ordinaryResult: PensionResult | null;
    methodNote: string;
    sourceLabel: string | null;
    officialSimReference: OfficialSimulationData | null;
    lifePath: LifePathAssumptions;
  };
  /** Ficha + proyección automática del subsidio mayores de 52 */
  subsidio52: Subsidio52Projection;
  pensionImpact: {
    vsFreezeMonthly: number | null;
    vsOfficialSimMonthly: number | null;
    note: string;
  };
  /** Cadena ERP: bruto → neto → base → impacto → comparativa → informe */
  erpPipeline: Subsidio52ErpPipeline;
  disclaimer: string;
}

function parseBirthDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const dmy = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return null;
}

function addAgeYears(birth: Date, ageYears: number): Date {
  const years = Math.floor(ageYears);
  const months = Math.round((ageYears - years) * 12);
  return addMonths(addYears(birth, years), months);
}

function ageAt(birth: Date, when: Date): number {
  let age = when.getFullYear() - birth.getFullYear();
  const m = when.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && when.getDate() < birth.getDate())) age--;
  return age;
}

function ageExactYears(birth: Date, when: Date): number {
  return differenceInMonths(when, birth) / 12;
}

function dateLabel(d: Date): string {
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function buildRetirementOutlook(
  expediente: ExpedienteDigital,
  asOf: Date = new Date(),
  lifePath: LifePathAssumptions = DEFAULT_LIFE_PATH
): RetirementOutlook | null {
  const rules = getActiveSsRules();
  const birth = parseBirthDate(expediente.identificacion.fechaNacimiento?.value);
  const anos = expediente.resumen.anosCotizados?.value ?? 0;
  const meses = expediente.resumen.mesesCotizados?.value ?? 0;
  const totalMonths =
    anos * 12 + meses ||
    Math.round((expediente.resumen.totalDiasCotizacion?.value ?? 0) / 30.4375);

  if (!birth || totalMonths <= 0) return null;

  const ageTodayExact = ageExactYears(birth, asOf);
  const ageToday = ageAt(birth, asOf);

  // Subsidio +52 cotiza → proyectamos carrera (no freeze)
  const resolved = resolveOrdinaryRetirement({
    birth,
    monthsContributedNow: totalMonths,
    asOf,
    assumeContinueContributing: true,
  });
  const freeze = resolveOrdinaryRetirement({
    birth,
    monthsContributedNow: totalMonths,
    asOf,
    assumeContinueContributing: false,
  });

  const ordinaryDate = resolved.date;
  const monthsMissingFor35 = Math.max(0, rules.earlyVoluntaryMinMonths - totalMonths);

  const age63Date = addAgeYears(birth, rules.earlyVoluntaryMinAge);
  let earliestEarly: Date | null = null;
  if (totalMonths >= rules.earlyVoluntaryMinMonths) {
    earliestEarly = age63Date < asOf ? asOf : age63Date;
  } else {
    const when35IfWorking = addMonths(asOf, monthsMissingFor35);
    earliestEarly = when35IfWorking > age63Date ? when35IfWorking : age63Date;
  }

  const yearsAtOrdinary = resolved.monthsAtRetirement / 12;
  const coef = getEarlyCoefficientPerQuarter(yearsAtOrdinary, rules);
  const real = getRealPensionSnapshot(expediente, {
    lifePath,
    retirementDate: ordinaryDate,
    asOf,
  });
  const birthIso = format(birth, 'yyyy-MM-dd');

  const ordinaryMonthly = real.ordinaryMonthly;
  const ordinaryResult: PensionResult | null =
    ordinaryMonthly != null
      ? {
          baseReguladora: real.baseReguladora ?? ordinaryMonthly,
          percentageByYears: real.percentageByYears ?? 100,
          monthlyPension: ordinaryMonthly,
          annualPension: Math.round(ordinaryMonthly * 14 * 100) / 100,
          effectivePension: ordinaryMonthly,
          isCapped: false,
          maxPension2024: rules.maxPensionMonthly,
          disclaimer:
            real.quality === 'bases_plus_path'
              ? 'Informe de bases (pasado) + subsidio mayores 52 (futuro).'
              : 'Calculado solo con bases documentadas del informe.',
        }
      : null;

  function pensionAt(monthsEarly: number): number | null {
    if (ordinaryMonthly == null) return null;
    return applyEarlyReduction(ordinaryMonthly, monthsEarly, yearsAtOrdinary).monthly;
  }

  const earlyAges = [63, 64, 65].filter((a) => addAgeYears(birth, a) < ordinaryDate);

  const scenarios: EarlyScenario[] = earlyAges.map((a) => {
    const d = addAgeYears(birth, a);
    const monthsEarly = Math.max(0, differenceInMonths(ordinaryDate, d));
    const quarters = Math.ceil(monthsEarly / 3);
    const reductionPercent = Math.min(50, Math.round(quarters * coef * 10000) / 100);
    return {
      label: `A los ${a} años`,
      retirementAge: a,
      retirementDate: d,
      monthsEarly,
      quartersEarly: quarters,
      reductionPercent,
      coefficientPerQuarterPercent: Math.round(coef * 10000) / 100,
      estimatedMonthly: pensionAt(monthsEarly),
    };
  });

  const erpPipeline = buildSubsidio52ErpPipeline({
    expediente,
    retirementDate: ordinaryDate,
    freezeRetirementDate: freeze.date,
    pensionWithPath: ordinaryMonthly,
    lifePath,
    asOf,
  });
  const subsidio52 = erpPipeline.projection;
  const pensionImpact = {
    vsFreezeMonthly: erpPipeline.comparativa.deltas.vsFreeze,
    vsOfficialSimMonthly: erpPipeline.comparativa.deltas.vsSimSs,
    note: pensionImpactFromSubsidio({
      pensionWithSubsidioPath: ordinaryMonthly,
      pensionIfFreeze: erpPipeline.comparativa.sinCotizarMas.pensionMensual,
      officialSimReference: erpPipeline.comparativa.simulacionSs.pensionMensual,
    }).note,
  };

  return {
    asOf: asOf.toISOString(),
    birthDate: birthIso,
    ageToday,
    ageTodayLabel: formatAgeYearsMonths(ageTodayExact),
    totalMonthsContributed: totalMonths,
    carrera: monthsToYearsMonths(totalMonths),
    ordinary: {
      ageYears: resolved.ageYears,
      ageLabel: formatAgeYearsMonths(resolved.ageYears),
      date: ordinaryDate,
      dateLabel: dateLabel(ordinaryDate),
      at65IfCareer: resolved.at65,
      monthsMissingForAge65: resolved.monthsStillNeededFor65,
      monthsProjectedAtRetirement: resolved.monthsAtRetirement,
      assumption: resolved.assumption,
      explanation: isSubsidio52Active(lifePath)
        ? `${resolved.explanation} (con cotización del subsidio +52 desde ${lifePath.subsidioMayores52From}).`
        : resolved.explanation,
    },
    ordinaryIfFreeze:
      freeze.at65 !== resolved.at65 || freeze.date.getTime() !== resolved.date.getTime()
        ? {
            ageYears: freeze.ageYears,
            ageLabel: formatAgeYearsMonths(freeze.ageYears),
            dateLabel: dateLabel(freeze.date),
            at65IfCareer: freeze.at65,
          }
        : null,
    earlyVoluntary: {
      minAge: rules.earlyVoluntaryMinAge,
      minYearsRequired: 35,
      monthsMissingFor35,
      earliestEligibleDate: earliestEarly,
      earliestEligibleLabel: earliestEarly ? dateLabel(earliestEarly) : null,
      canRetireEarlyWhenReady: true,
      scenarios,
    },
    pension: {
      quality: real.quality,
      basesDocumentadas: real.basesDocumentadas,
      basesRequeridas: real.basesRequeridas,
      ordinaryResult: ordinaryResult,
      methodNote: real.note,
      sourceLabel: real.sourceLabel,
      officialSimReference: real.officialSimReference,
      lifePath: real.lifePath,
    },
    subsidio52,
    pensionImpact,
    erpPipeline,
    disclaimer:
      'ERP: IPREM×95% → neto → base cotización → impacto → comparativa → informe. Cambias subsidio-52-params.json y todo recalcula.',
  };
}

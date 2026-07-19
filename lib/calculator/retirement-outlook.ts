/**
 * Outlook de jubilación — presente = informe de bases;
 * futuro = escenario vital (desempleo → subsidio +52).
 * La simulación SS oficial es solo referencia (empleo continuo).
 */
import { addMonths, addYears, differenceInMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { contributionMonthsFromExpediente, contributionYmdFromExpediente } from '@/lib/expediente/as-of';
import {
  formatAgeYearsMonths,
  getActiveSsRules,
  resolveOrdinaryRetirement,
} from '@/lib/rules/ss-rules';
import {
  addYmdToDate,
  formatDateDmy,
  monthsRequirementToYmd,
  subtractYmd,
  ymdLabel,
  type Ymd,
} from './career-ymd';
import { computeAnticipation } from '@/lib/rules/early-retirement';
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
  /** @deprecated Los coeficientes oficiales son mensuales (tabla BOE), no por trimestre. */
  quartersEarly: number;
  reductionPercent: number;
  /** @deprecated Usar reductionPercent (celda oficial de la tabla). */
  coefficientPerQuarterPercent: number;
  estimatedMonthly: number | null;
  legalBasis?: string;
  careerBracketLabel?: string;
}

export interface RetirementOutlook {
  asOf: string;
  birthDate: string;
  ageToday: number;
  ageTodayLabel: string;
  totalMonthsContributed: number;
  /** Carrera computable con día (del informe VL). */
  carrera: Ymd;
  carreraLabel: string;
  ordinary: {
    ageYears: number;
    ageLabel: string;
    date: Date;
    dateLabel: string;
    at65IfCareer: boolean;
    monthsMissingForAge65: number;
    /** Falta exacta hasta carrera a los 65 (p. ej. 4a 10m 29d). */
    missingForAge65: Ymd;
    missingForAge65Label: string;
    /** Si sigue cotizando sin interrupción, cuándo alcanza la carrera exigida. */
    careerCompleteDate: Date | null;
    careerCompleteDateLabel: string | null;
    monthsProjectedAtRetirement: number;
    assumption: 'continue' | 'freeze';
    explanation: string;
    /** Los 4 pasos del cálculo SS aplicados a este expediente. */
    ssSteps: Array<{ title: string; detail: string }>;
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
  return format(d, 'dd/MM/yyyy');
}

/** Forma larga opcional para textos narrativos. */
export function dateLabelLong(d: Date): string {
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function buildRetirementOutlook(
  expediente: ExpedienteDigital,
  asOf: Date = new Date(),
  lifePath: LifePathAssumptions = DEFAULT_LIFE_PATH
): RetirementOutlook | null {
  const rules = getActiveSsRules();
  const birth = parseBirthDate(expediente.identificacion.fechaNacimiento?.value);
  const totalMonths = contributionMonthsFromExpediente(expediente);
  const carrera = contributionYmdFromExpediente(expediente);

  if (!birth || totalMonths <= 0) return null;

  const birthDate = birth;
  const ageTodayExact = ageExactYears(birthDate, asOf);
  const ageToday = ageAt(birthDate, asOf);

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
  const real = getRealPensionSnapshot(expediente, {
    lifePath,
    retirementDate: ordinaryDate,
    asOf,
  });
  const birthIso = format(birthDate, 'yyyy-MM-dd');

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

  function pensionAt(retirementDate: Date): {
    monthly: number | null;
    reductionPercent: number;
    monthsEarly: number;
    legalBasis?: string;
    bracketLabel?: string;
  } {
    if (ordinaryMonthly == null) {
      return { monthly: null, reductionPercent: 0, monthsEarly: 0 };
    }
    const anticipation = computeAnticipation(ordinaryDate, retirementDate);
    const reduced = applyEarlyReduction(
      ordinaryMonthly,
      anticipation.monthsEarly,
      yearsAtOrdinary,
      {
        ordinaryDate,
        chosenDate: retirementDate,
        birthDate: birthDate,
        rulesYear: retirementDate.getFullYear(),
      }
    );
    return {
      monthly: reduced.monthly,
      reductionPercent: reduced.reductionPercent,
      monthsEarly: anticipation.monthsEarly,
      legalBasis: reduced.detail?.resolution.legalNormSummary,
      bracketLabel: reduced.detail?.resolution.bracket.label,
    };
  }

  const earlyAges = [63, 64, 65].filter((a) => addAgeYears(birthDate, a) < ordinaryDate);

  const scenarios: EarlyScenario[] = earlyAges.map((a) => {
    const d = addAgeYears(birthDate, a);
    const p = pensionAt(d);
    return {
      label: `A los ${a} años`,
      retirementAge: a,
      retirementDate: d,
      monthsEarly: p.monthsEarly,
      quartersEarly: Math.ceil(p.monthsEarly / 3),
      reductionPercent: p.reductionPercent,
      coefficientPerQuarterPercent: p.reductionPercent,
      estimatedMonthly: p.monthly,
      legalBasis: p.legalBasis,
      careerBracketLabel: p.bracketLabel,
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

  const requiredFor65 = monthsRequirementToYmd(resolved.monthsRequiredFor65);
  const missingForAge65 = subtractYmd(requiredFor65, carrera);
  const careerCompleteDate =
    missingForAge65.years + missingForAge65.months + missingForAge65.days > 0
      ? addYmdToDate(asOf, missingForAge65)
      : asOf;
  const missingLabel = ymdLabel(missingForAge65);
  const carreraLabel = ymdLabel(carrera);

  let explanation = resolved.explanation;
  if (resolved.at65) {
    explanation =
      `A ${carreraLabel} computables (informe ${dateLabel(asOf)}). ` +
      (missingForAge65.years + missingForAge65.months + missingForAge65.days > 0
        ? `Te faltan ${missingLabel} para los ${requiredFor65.years} años y ${requiredFor65.months} meses exigidos a los 65; cotizando sin interrupción los alcanzas el ${formatDateDmy(careerCompleteDate)}. `
        : '') +
      `Jubilación ordinaria: ${dateLabel(ordinaryDate)} (65 años).`;
    if (isSubsidio52Active(lifePath)) {
      explanation += ` (con cotización del subsidio +52 desde ${lifePath.subsidioMayores52From}).`;
    }
  } else if (isSubsidio52Active(lifePath)) {
    explanation = `${resolved.explanation} (con cotización del subsidio +52 desde ${lifePath.subsidioMayores52From}).`;
  }

  const pctAtOrdinary =
    ordinaryResult != null
      ? `${ordinaryResult.percentageByYears.toFixed(0)} %`
      : resolved.at65
        ? '100 %'
        : 'según años a esa fecha';

  const ssSteps: Array<{ title: string; detail: string }> = [
    {
      title: '1. Edad de jubilación',
      detail: resolved.at65
        ? `Con el período mínimo de cotización exigido, la edad ordinaria es 65 años: ${dateLabel(ordinaryDate)}.`
        : `Sin carrera completa a los 65, la ordinaria sería a los ${formatAgeYearsMonths(resolved.ageYears)} (${dateLabel(ordinaryDate)}).`,
    },
    {
      title: '2. Base reguladora',
      detail:
        'En 2032 (período transitorio 2026–2040) la SS calcula con dos métodos y elige el más beneficioso, según las bases de cotización de los últimos años — no solo por años cotizados.' +
        (ordinaryResult
          ? ` Estimación actual de BR: ${Math.round(ordinaryResult.baseReguladora).toLocaleString('es-ES')} €/mes.`
          : ' Relee el informe de bases para una estimación numérica.'),
    },
    {
      title: '3. Porcentaje por años cotizados',
      detail: resolved.at65
        ? `Si continúas cotizando hasta ${dateLabel(ordinaryDate)}, superarás ${requiredFor65.years} años y ${requiredFor65.months} meses: corresponde el ${pctAtOrdinary} de la base reguladora (salvo otros límites legales).`
        : `Con la proyección actual el porcentaje estimado es ${pctAtOrdinary} de la base reguladora.`,
    },
    {
      title: '4. Coeficiente reductor (solo anticipada)',
      detail: resolved.at65
        ? `Si te jubilas el ${dateLabel(ordinaryDate)}, no hay penalización por edad. Si te adelantas, el descuento depende de los meses de anticipo y de los años cotizados, y es permanente.`
        : 'Una jubilación anticipada aplica un coeficiente reductor permanente según meses de anticipo y carrera.',
    },
  ];

  return {
    asOf: asOf.toISOString(),
    birthDate: birthIso,
    ageToday,
    ageTodayLabel: formatAgeYearsMonths(ageTodayExact),
    totalMonthsContributed: totalMonths,
    carrera,
    carreraLabel,
    ordinary: {
      ageYears: resolved.ageYears,
      ageLabel: formatAgeYearsMonths(resolved.ageYears),
      date: ordinaryDate,
      dateLabel: dateLabel(ordinaryDate),
      at65IfCareer: resolved.at65,
      monthsMissingForAge65: resolved.monthsStillNeededFor65,
      missingForAge65,
      missingForAge65Label: missingLabel,
      careerCompleteDate:
        missingForAge65.years + missingForAge65.months + missingForAge65.days > 0
          ? careerCompleteDate
          : null,
      careerCompleteDateLabel:
        missingForAge65.years + missingForAge65.months + missingForAge65.days > 0
          ? formatDateDmy(careerCompleteDate)
          : null,
      monthsProjectedAtRetirement: resolved.monthsAtRetirement,
      assumption: resolved.assumption,
      explanation,
      ssSteps,
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

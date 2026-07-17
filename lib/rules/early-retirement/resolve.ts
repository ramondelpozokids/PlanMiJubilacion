import { computeAnticipation } from './anticipation';
import { resolveCareerBracket } from './brackets';
import { lookupOfficialReductionPercent } from './tables';
import type {
  ApplyOfficialEarlyReductionResult,
  CoefficientTableKind,
  EarlyCoefficientLookup,
  EarlyRetirementModality,
  EarlyRetirementResolution,
} from './types';

/** Mínimos legales arts. 207/208. */
export const EARLY_VOLUNTARY_MAX_MONTHS = 24;
export const EARLY_INVOLUNTARY_MAX_MONTHS = 48;
export const EARLY_VOLUNTARY_MIN_CONTRIBUTION_MONTHS = 35 * 12; // 420
export const EARLY_INVOLUNTARY_MIN_CONTRIBUTION_MONTHS = 33 * 12; // 396

export interface ResolveEarlyRetirementInput {
  ordinaryDate: Date;
  chosenDate: Date;
  birthDate: Date;
  /** Meses cotizados completos en el hecho causante (fecha elegida). */
  completeContributionMonthsAtChosen: number;
  /**
   * El usuario declara causa no imputable (despido, etc.).
   * Sin esta declaración no se asume involuntaria salvo que no quepa voluntaria.
   */
  declareInvoluntaryCause?: boolean;
  /**
   * Art. 208.3: percibe subsidio desempleo ≥ 3 meses → coeficientes del 207
   * aunque la modalidad de acceso sea voluntaria.
   */
  applyInvoluntaryCoefficientsViaSubsidy208_3?: boolean;
  /** Año del hecho causante (por defecto: año de la fecha elegida). */
  rulesYear?: number;
  /**
   * Si la pensión teórica (antes de reducción) supera la máxima,
   * se usa DT 34ª para el coeficiente sobre máxima (voluntaria).
   */
  theoreticalMonthlyExceedsMax?: boolean;
}

function modalityLabel(m: EarlyRetirementModality): string {
  switch (m) {
    case 'ordinary':
      return 'Jubilación ordinaria';
    case 'deferred':
      return 'Jubilación demorada';
    case 'voluntary':
      return 'Jubilación anticipada voluntaria';
    case 'involuntary':
      return 'Jubilación anticipada involuntaria';
    case 'not_eligible':
      return 'Fecha no elegible como anticipada';
  }
}

/**
 * Determina modalidad + coeficiente oficial (solo lectura de tabla).
 */
export function resolveEarlyRetirement(
  input: ResolveEarlyRetirementInput
): EarlyRetirementResolution {
  const anticipation = computeAnticipation(input.ordinaryDate, input.chosenDate);
  const completeMonths = Math.floor(input.completeContributionMonthsAtChosen);
  const bracket = resolveCareerBracket(completeMonths);
  const rulesYear = input.rulesYear ?? input.chosenDate.getFullYear();
  const notes: string[] = [];
  void input.birthDate; // reservado para comprobaciones de edad en ampliaciones
  if (anticipation.isDeferred) {
    return {
      modality: 'deferred',
      modalityLabel: modalityLabel('deferred'),
      anticipation,
      bracket,
      completeContributionMonths: completeMonths,
      coefficient: null,
      notes: ['La fecha elegida es posterior a la ordinaria estimada (demora).'],
      legalNormSummary: 'LGSS art. 210 (jubilación demorada) — bonus aparte del motor anticipada.',
    };
  }

  if (anticipation.monthsEarly <= 0) {
    return {
      modality: 'ordinary',
      modalityLabel: modalityLabel('ordinary'),
      anticipation,
      bracket,
      completeContributionMonths: completeMonths,
      coefficient: null,
      notes: ['Sin adelanto respecto a la edad ordinaria estimada.'],
      legalNormSummary: 'LGSS art. 205 — jubilación ordinaria.',
    };
  }

  const canVoluntary =
    anticipation.monthsEarly <= EARLY_VOLUNTARY_MAX_MONTHS &&
    completeMonths >= EARLY_VOLUNTARY_MIN_CONTRIBUTION_MONTHS;

  const canInvoluntary =
    anticipation.monthsEarly <= EARLY_INVOLUNTARY_MAX_MONTHS &&
    completeMonths >= EARLY_INVOLUNTARY_MIN_CONTRIBUTION_MONTHS;

  let modality: EarlyRetirementModality;
  let tableKind: CoefficientTableKind;
  let legalNormSummary: string;

  // Preferencia: si declara causa involuntaria y encaja → 207;
  // si encaja en voluntaria → 208; si solo involuntaria → 207 informativo.
  if (input.declareInvoluntaryCause && canInvoluntary) {
    modality = 'involuntary';
    tableKind = 'involuntary';
    legalNormSummary = 'LGSS art. 207 — anticipada por causa no imputable al trabajador.';
  } else if (canVoluntary) {
    modality = 'voluntary';
    if (input.applyInvoluntaryCoefficientsViaSubsidy208_3) {
      tableKind = 'involuntary';
      notes.push(
        'Art. 208.3 LGSS: subsidio de desempleo ≥ 3 meses → se aplican coeficientes del art. 207.'
      );
      legalNormSummary =
        'LGSS art. 208 (acceso voluntario) + art. 208.3 (coeficientes art. 207 por subsidio).';
    } else if (input.theoreticalMonthlyExceedsMax) {
      tableKind = 'voluntary_over_max';
      notes.push(
        'Pensión teórica superior a la máxima: coeficiente DT 34ª LGSS (transición sobre máxima).'
      );
      legalNormSummary =
        'LGSS art. 208 + DT 34ª / art. 210.3 (coeficientes cuando la pensión supera la máxima).';
    } else {
      tableKind = 'voluntary';
      legalNormSummary = 'LGSS art. 208 — jubilación anticipada por voluntad del interesado.';
    }
  } else if (canInvoluntary) {
    modality = 'involuntary';
    tableKind = 'involuntary';
    notes.push(
      'La fecha encaja en ventana involuntaria (hasta 4 años / 33 cotizados), pero falta acreditar causa del art. 207.1.d). Se muestra coeficiente involuntario a título informativo.'
    );
    legalNormSummary =
      'LGSS art. 207 (ventana temporal) — pendiente acreditar causa de cese.';
  } else {
    return {
      modality: 'not_eligible',
      modalityLabel: modalityLabel('not_eligible'),
      anticipation,
      bracket,
      completeContributionMonths: completeMonths,
      coefficient: null,
      notes: [
        `Adelanto de ${anticipation.monthsEarly} meses. Revisar requisitos: voluntaria ≤24 meses y ≥35 años cotizados; involuntaria ≤48 meses y ≥33 años cotizados.`,
      ],
      legalNormSummary: 'Fuera de los supuestos de los arts. 207 y 208 LGSS.',
    };
  }

  const looked = lookupOfficialReductionPercent({
    kind: tableKind,
    year: rulesYear,
    monthsEarly: anticipation.monthsEarly,
    bracketId: bracket.id,
  });

  const coefficient: EarlyCoefficientLookup = {
    reductionPercent: looked.reductionPercent,
    bracket,
    monthsEarlyUsed: looked.monthsEarlyUsed,
    tableKind,
    legalBasis: looked.legalBasis,
    boeRef: looked.boeRef,
    tableYear: looked.tableYear,
  };

  notes.push(
    `Tramo: ${bracket.label} (${completeMonths} meses cotizados completos).`,
    `Meses de adelanto (mes o fracción): ${anticipation.monthsEarly}` +
      (anticipation.days > 0
        ? ` (${anticipation.years}a ${anticipation.months}m ${anticipation.days}d → fracción de mes).`
        : ` (${anticipation.years}a ${anticipation.months}m).`),
    `Coeficiente leído de tabla ${coefficient.tableYear} / ${coefficient.tableKind}: ${coefficient.reductionPercent} %.`
  );

  return {
    modality,
    modalityLabel: modalityLabel(modality),
    anticipation,
    bracket,
    completeContributionMonths: completeMonths,
    coefficient,
    notes,
    legalNormSummary,
  };
}

/**
 * Aplica el coeficiente oficial leído de tabla a la pensión ordinaria estimada.
 * Si aplica DT 34ª (sobre máxima), la reducción se calcula sobre el tope máximo.
 */
export function applyOfficialEarlyReduction(
  ordinaryMonthly: number,
  input: ResolveEarlyRetirementInput,
  maxPensionMonthly?: number
): ApplyOfficialEarlyReductionResult {
  const exceeds =
    input.theoreticalMonthlyExceedsMax ??
    (maxPensionMonthly != null && ordinaryMonthly > maxPensionMonthly);

  const resolution = resolveEarlyRetirement({
    ...input,
    theoreticalMonthlyExceedsMax: exceeds,
  });
  const reductionPercent = resolution.coefficient?.reductionPercent ?? 0;

  const baseForReduction =
    resolution.coefficient?.tableKind === 'voluntary_over_max' && maxPensionMonthly != null
      ? maxPensionMonthly
      : ordinaryMonthly;

  const monthly =
    reductionPercent <= 0
      ? ordinaryMonthly
      : Math.round(baseForReduction * (1 - reductionPercent / 100) * 100) / 100;

  return {
    monthly: Math.max(0, monthly),
    reductionPercent,
    resolution,
    ordinaryMonthlyBeforeReduction: ordinaryMonthly,
    appliedOverMaxPension: resolution.coefficient?.tableKind === 'voluntary_over_max',
  };
}

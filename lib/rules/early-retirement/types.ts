/**
 * Motor de jubilación anticipada — solo lectura de tablas oficiales BOE.
 * Las fórmulas de % NO viven aquí: se consultan JSON en tables/YYYY/.
 */

export type CareerBracketId =
  | 'less_than_38y6m'
  | 'from_38y6m_to_41y6m'
  | 'from_41y6m_to_44y6m'
  | 'from_44y6m';

export type EarlyRetirementModality =
  | 'ordinary'
  | 'deferred'
  | 'voluntary'
  | 'involuntary'
  | 'not_eligible';

export type CoefficientTableKind =
  | 'voluntary'
  | 'involuntary'
  | 'voluntary_over_max';

export interface AnticipationBreakdown {
  /** Años completos entre fechas (solo transparencia). */
  years: number;
  /** Meses residuales completos. */
  months: number;
  /** Días residuales. */
  days: number;
  /**
   * Meses de adelanto a efectos legales (art. 207/208):
   * «por cada mes o fracción de mes».
   */
  monthsEarly: number;
  isDeferred: boolean;
}

export interface CareerBracket {
  id: CareerBracketId;
  label: string;
  /** Meses cotizados mínimos inclusive (periodos completos). */
  minMonthsInclusive: number;
  /** Meses cotizados máximos exclusive; null = sin techo. */
  maxMonthsExclusive: number | null;
}

export const CAREER_BRACKETS: CareerBracket[] = [
  {
    id: 'less_than_38y6m',
    label: 'Menos de 38 años y 6 meses',
    minMonthsInclusive: 0,
    maxMonthsExclusive: 38 * 12 + 6,
  },
  {
    id: 'from_38y6m_to_41y6m',
    label: 'Igual o superior a 38 años y 6 meses e inferior a 41 años y 6 meses',
    minMonthsInclusive: 38 * 12 + 6,
    maxMonthsExclusive: 41 * 12 + 6,
  },
  {
    id: 'from_41y6m_to_44y6m',
    label: 'Igual o superior a 41 años y 6 meses e inferior a 44 años y 6 meses',
    minMonthsInclusive: 41 * 12 + 6,
    maxMonthsExclusive: 44 * 12 + 6,
  },
  {
    id: 'from_44y6m',
    label: 'Igual o superior a 44 años y 6 meses',
    minMonthsInclusive: 44 * 12 + 6,
    maxMonthsExclusive: null,
  },
];

export interface EarlyCoefficientLookup {
  reductionPercent: number;
  bracket: CareerBracket;
  monthsEarlyUsed: number;
  tableKind: CoefficientTableKind;
  legalBasis: string;
  boeRef: string;
  tableYear: number;
}

export interface EarlyRetirementResolution {
  modality: EarlyRetirementModality;
  modalityLabel: string;
  anticipation: AnticipationBreakdown;
  bracket: CareerBracket;
  /** Meses cotizados completos usados para el tramo. */
  completeContributionMonths: number;
  coefficient: EarlyCoefficientLookup | null;
  notes: string[];
  legalNormSummary: string;
}

export interface ApplyOfficialEarlyReductionResult {
  monthly: number;
  reductionPercent: number;
  resolution: EarlyRetirementResolution;
  ordinaryMonthlyBeforeReduction: number;
  appliedOverMaxPension: boolean;
}

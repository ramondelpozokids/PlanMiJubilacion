/**
 * Cotizaciones internacionales — tipos de dominio.
 * No calcula importes de pensión extranjera.
 */

export type CoordinationFramework =
  | 'eu_eea_ch'
  | 'uk_tca'
  | 'bilateral'
  | 'cmiss'
  | 'none'
  | 'unknown';

export type DiscountMode = 'free' | 'reduced' | 'full';

export interface ForeignCotizationPeriod {
  id: string;
  countryCode: string;
  countryName: string;
  yearsContributed: number | null;
  approximateStart: string | null;
  approximateEnd: string | null;
  stillContributing: boolean;
  pensionAlreadyRequested: boolean;
  notes?: string;
  /**
   * Importe mensual oficial que comunica el organismo extranjero
   * (carta/resolución de pensión). Solo si el usuario aporta el documento.
   * Nunca se inventa: si no hay cifra documentada, queda null.
   */
  documentedMonthlyPensionEur: number | null;
  /** Origen de la cifra (ej. «Carta Deutsche Rentenversicherung 2026») */
  documentedPensionSource?: string | null;
  /** Fecha del documento oficial (YYYY-MM-DD o YYYY-MM) */
  documentedPensionDate?: string | null;
}

export interface InternationalCotizacionesData {
  hasWorkedAbroad: boolean;
  periods: ForeignCotizationPeriod[];
  updatedAt: string;
}

export interface CountryCoordinationInfo {
  code: string;
  name: string;
  frameworks: CoordinationFramework[];
  bilateralWithSpain: boolean;
  cmissMember: boolean;
  euEeaCh: boolean;
  ukPostBrexit: boolean;
}

export interface CountryEvaluation {
  period: ForeignCotizationPeriod;
  country: CountryCoordinationInfo;
  coordinationType: CoordinationFramework;
  totalizationPossible: boolean;
  legalBasis: string;
  /** true solo si hay importe documentado por el organismo extranjero */
  foreignPensionDocumented: boolean;
  documentedMonthlyEur: number | null;
  warnings: string[];
  nextSteps: string[];
}

export interface InternationalCoordinationResult {
  hasInternationalActivity: boolean;
  evaluations: CountryEvaluation[];
  totalizationPossibleAny: boolean;
  multiplePensionsLikely: boolean;
  spanishEstimateMayBeIncomplete: boolean;
  globalWarnings: string[];
  recommendations: string[];
  summaryLines: string[];
}

export type ServiceKey =
  | 'informe_estandar'
  | 'informe_internacional'
  | 'informe_premium'
  | 'revision_internacional';

export interface PricingRule {
  serviceKey: ServiceKey;
  label: string;
  description: string;
  priceCents: number;
  currency: 'eur';
  discountMode: DiscountMode;
  active: boolean;
}

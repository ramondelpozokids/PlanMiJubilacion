/**
 * Escenario vital del usuario (hipótesis de futuro).
 * El presente documental = informe de bases.
 * La simulación SS oficial es otra hipótesis (empleo continuo) — NO es el escenario por defecto.
 * Cotización futura del subsidio +52 = config oficial (lib/rules/subsidio-52.ts).
 *
 * Caso fundador (Ramón del Pozo Rott, jubilación ordinaria 02/08/2032):
 * - Paro contributivo SEPE con base 3.357 €/mes (doc. ene–may 2026) hasta ene/2027
 * - Subsidio mayores de 52 desde feb/2027 hasta la jubilación (base oficial 125 % mínima)
 */
import {
  deriveSubsidio52Amounts,
  getSubsidio52Config,
} from '@/lib/rules/subsidio-52';

export interface LifePathAssumptions {
  /** Desempleado hoy */
  currentlyUnemployed: boolean;
  /**
   * Mes a partir del cual cobra subsidio mayores de 52
   * (cotiza a la SS con base 125 % mínima). Formato YYYY-MM.
   */
  subsidioMayores52From: string;
  /**
   * Override opcional de base de cotización (€/mes).
   * Si null/0, se usa la base oficial del año (125 % mínima RG).
   */
  subsidioCotizacionBase: number | null;
  /**
   * Base entre el fin del tramo documentado / inicio del paro conocido
   * y el mes anterior al subsidio +52. 0 = sin cotización asimilada (conservador).
   */
  desempleoBaseAntesSubsidio: number;
  /**
   * Primer mes (YYYY-MM) en el que aplica `desempleoBaseAntesSubsidio`
   * (p. ej. inicio de bases SEPE conocidas). null = solo meses futuros tras “hoy”.
   */
  desempleoBaseFrom: string | null;
}

/** Base cotización SEPE (prestación contributiva) — Ramón, 2026 */
export const FOUNDER_SEPE_BASE_MENSUAL = 3357;
/** Primer mes con base SEPE conocida (informe / extractos) */
export const FOUNDER_SEPE_BASE_FROM = '2026-01';
/** Fin del paro contributivo; el mes siguiente empieza subsidio +52 */
export const FOUNDER_SUBSIDIO_52_FROM = '2027-02';

/**
 * Escenario por defecto del producto = caso del fundador (Ramón del Pozo Rott)
 * hasta jubilación 2032.
 * Base SEPE 3.357 €/mes (ene/2026 → ene/2027) → subsidio +52 (feb/2027 → jubilación).
 *
 * Solo para el plan personal. Las consultas de terceros usan
 * `DEFAULT_CONSULTATION_LIFE_PATH` (nunca este escenario).
 */
export const FOUNDER_LIFE_PATH: LifePathAssumptions = {
  currentlyUnemployed: true,
  subsidioMayores52From: FOUNDER_SUBSIDIO_52_FROM,
  subsidioCotizacionBase: null,
  desempleoBaseAntesSubsidio: FOUNDER_SEPE_BASE_MENSUAL,
  desempleoBaseFrom: FOUNDER_SEPE_BASE_FROM,
};

/** @deprecated Prefer FOUNDER_LIFE_PATH — mismo objeto (plan personal del fundador). */
export const DEFAULT_LIFE_PATH = FOUNDER_LIFE_PATH;

/** Asesoría / consultas: neutro hasta que se active en la ficha del cliente. */
export const DEFAULT_CONSULTATION_LIFE_PATH: LifePathAssumptions = {
  currentlyUnemployed: false,
  subsidioMayores52From: '2099-01',
  subsidioCotizacionBase: null,
  desempleoBaseAntesSubsidio: 0,
  desempleoBaseFrom: null,
};

export function isSubsidio52Active(life: LifePathAssumptions): boolean {
  const sub = parseYearMonth(life.subsidioMayores52From);
  if (!sub) return false;
  return sub.year < 2090;
}

export function parseLifePathJson(raw: unknown): LifePathAssumptions {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONSULTATION_LIFE_PATH };
  const o = raw as Record<string, unknown>;
  return {
    currentlyUnemployed: Boolean(o.currentlyUnemployed),
    subsidioMayores52From:
      typeof o.subsidioMayores52From === 'string'
        ? o.subsidioMayores52From
        : DEFAULT_CONSULTATION_LIFE_PATH.subsidioMayores52From,
    subsidioCotizacionBase:
      typeof o.subsidioCotizacionBase === 'number' ? o.subsidioCotizacionBase : null,
    desempleoBaseAntesSubsidio:
      typeof o.desempleoBaseAntesSubsidio === 'number' ? o.desempleoBaseAntesSubsidio : 0,
    desempleoBaseFrom:
      typeof o.desempleoBaseFrom === 'string' && /^\d{4}-\d{2}$/.test(o.desempleoBaseFrom)
        ? o.desempleoBaseFrom
        : null,
  };
}

export function parseYearMonth(ym: string): { year: number; month: number } | null {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function yearMonthKey(ym: { year: number; month: number }): number {
  return ym.year * 12 + ym.month;
}

/** Base oficial (o override) para un mes concreto en subsidio +52. */
export function officialCotizacionBaseForMonth(
  year: number,
  override: number | null | undefined
): number {
  if (override != null && override > 0) return override;
  return deriveSubsidio52Amounts(getSubsidio52Config(year)).baseCotizacion;
}

/**
 * Base de paro/asimilada SEPE para un mes, si cae en el tramo
 * [desempleoBaseFrom, subsidioMayores52From).
 */
export function desempleoBaseForMonth(
  year: number,
  month: number,
  life: LifePathAssumptions
): number {
  const amount = life.desempleoBaseAntesSubsidio;
  if (!amount || amount <= 0) return 0;
  const thisKey = year * 12 + month;
  const sub = parseYearMonth(life.subsidioMayores52From);
  if (sub && thisKey >= yearMonthKey(sub)) return 0;
  const from = life.desempleoBaseFrom ? parseYearMonth(life.desempleoBaseFrom) : null;
  if (from && thisKey < yearMonthKey(from)) return 0;
  return amount;
}

/** Base futura proyectada para un mes concreto según el escenario vital. */
export function projectedBaseForMonth(
  year: number,
  month: number,
  life: LifePathAssumptions,
  asOf: Date = new Date()
): number {
  const key = year * 12 + month;
  const asOfKey = asOf.getFullYear() * 12 + (asOf.getMonth() + 1);
  if (key <= asOfKey) return 0; // pasado = documentado o relleno en buildBasesSeries

  const sub = parseYearMonth(life.subsidioMayores52From);
  if (!sub) return desempleoBaseForMonth(year, month, life);
  const subKey = yearMonthKey(sub);
  if (key >= subKey) {
    return officialCotizacionBaseForMonth(year, life.subsidioCotizacionBase);
  }
  return desempleoBaseForMonth(year, month, life);
}

/** Etiquetas de tramos para UI (fundador / escenario por defecto). */
export function describeLifePathTramos(life: LifePathAssumptions): {
  paro: string | null;
  subsidio: string | null;
} {
  const paroBase = life.desempleoBaseAntesSubsidio;
  const from = life.desempleoBaseFrom;
  const sub = life.subsidioMayores52From;
  const paro =
    paroBase > 0 && from && isSubsidio52Active(life)
      ? `Paro SEPE · base ${paroBase.toLocaleString('es-ES')} €/mes · ${from} → mes anterior a ${sub}`
      : paroBase > 0
        ? `Paro / asimilada · base ${paroBase.toLocaleString('es-ES')} €/mes hasta el subsidio`
        : null;
  const subsidio = isSubsidio52Active(life)
    ? `Subsidio +52 · base oficial 125 % mínima desde ${sub} hasta la jubilación`
    : null;
  return { paro, subsidio };
}

/**
 * Escenario vital del usuario (hipótesis de futuro).
 * El presente documental = informe de bases.
 * La simulación SS oficial es otra hipótesis (empleo continuo) — NO es el escenario por defecto.
 * Cotización futura del subsidio +52 = config oficial (lib/rules/subsidio-52.ts).
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
   * Base entre “hoy” y el inicio del subsidio (desempleo sin subsidio +52).
   * 0 = sin cotización asimilada en ese tramo (conservador).
   */
  desempleoBaseAntesSubsidio: number;
}

/** Inicio previsto: ene/feb 2027. Base = config oficial (no hardcode). */
export const DEFAULT_LIFE_PATH: LifePathAssumptions = {
  currentlyUnemployed: true,
  subsidioMayores52From: '2027-02',
  subsidioCotizacionBase: null,
  desempleoBaseAntesSubsidio: 0,
};

/** Asesoría: sin subsidio hasta que el fundador lo active en la consulta. */
export const DEFAULT_CONSULTATION_LIFE_PATH: LifePathAssumptions = {
  currentlyUnemployed: false,
  subsidioMayores52From: '2099-01',
  subsidioCotizacionBase: null,
  desempleoBaseAntesSubsidio: 0,
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

/** Base oficial (o override) para un mes concreto en subsidio +52. */
export function officialCotizacionBaseForMonth(
  year: number,
  override: number | null | undefined
): number {
  if (override != null && override > 0) return override;
  return deriveSubsidio52Amounts(getSubsidio52Config(year)).baseCotizacion;
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
  if (key <= asOfKey) return 0; // pasado = solo documentado

  const sub = parseYearMonth(life.subsidioMayores52From);
  if (!sub) return life.desempleoBaseAntesSubsidio;
  const subKey = sub.year * 12 + sub.month;
  if (key >= subKey) {
    return officialCotizacionBaseForMonth(year, life.subsidioCotizacionBase);
  }
  return life.desempleoBaseAntesSubsidio;
}

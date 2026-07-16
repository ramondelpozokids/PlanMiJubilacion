/**
 * Reglas subsidio mayores de 52 — lee `subsidio-52-params.json`.
 *
 * Cadena ERP: IPREM × subsidio52 → bruto → neto → baseMinima → impacto → comparativa → informe
 * Año vacío {} = hereda. Cambias el JSON → outlook/recalculate refresca todo.
 */
import rawFile from './subsidio-52-params.json';

export type LegalStatus = 'official' | 'provisional';

export interface Subsidio52RawParams {
  iprem?: number;
  smi?: number;
  baseMinima?: number;
  subsidio52?: number;
  /** Importe mensual oficial (12 pagas). Si existe, sustituye IPREM × %. */
  importeMensual?: number;
  cotizacion52?: number;
  irpfDefecto?: number;
}

export interface Subsidio52YearConfig {
  year: number;
  status: LegalStatus;
  ipremMonthly: number;
  subsidioPercentOfIprem: number;
  /** Importe mensual fijado en JSON (p. ej. 480 €). */
  subsidioMensualFijo: number | null;
  baseMinimaRegimenGeneral: number;
  cotizacionPercentOfMinima: number;
  irpfRetentionRate: number;
  smiMonthly14: number;
  rentLimitPercentOfSmi: number;
  sources: string[];
  notes: string;
}

const RENT_LIMIT_PCT = 0.75;

/** Solo claves YYYY (ignora `_comment`). */
export function yearParamsMap(): Record<string, Subsidio52RawParams> {
  const out: Record<string, Subsidio52RawParams> = {};
  for (const [k, v] of Object.entries(rawFile as Record<string, unknown>)) {
    if (!/^\d{4}$/.test(k)) continue;
    if (!v || typeof v !== 'object') continue;
    out[k] = v as Subsidio52RawParams;
  }
  return out;
}

function isFilled(p: Subsidio52RawParams | undefined): p is Required<Subsidio52RawParams> {
  if (!p) return false;
  return (
    p.iprem != null &&
    p.smi != null &&
    p.baseMinima != null &&
    p.subsidio52 != null &&
    p.cotizacion52 != null &&
    p.irpfDefecto != null
  );
}

export function resolveRawParams(year: number): {
  raw: Required<Subsidio52RawParams>;
  inheritedFrom: number | null;
  status: LegalStatus;
} {
  const PARAMS = yearParamsMap();
  const years = Object.keys(PARAMS).map(Number).sort((a, b) => a - b);

  if (isFilled(PARAMS[String(year)])) {
    return {
      raw: PARAMS[String(year)] as Required<Subsidio52RawParams>,
      inheritedFrom: null,
      status: 'official',
    };
  }

  const prior = [...years].filter((y) => y < year && isFilled(PARAMS[String(y)])).pop();
  const later = years.find((y) => y > year && isFilled(PARAMS[String(y)]));
  const sourceYear = prior ?? later ?? years.find((y) => isFilled(PARAMS[String(y)]));

  if (sourceYear == null) {
    throw new Error('subsidio-52-params.json sin ningún año con datos');
  }

  return {
    raw: PARAMS[String(sourceYear)] as Required<Subsidio52RawParams>,
    inheritedFrom: sourceYear,
    status: 'provisional',
  };
}

function toConfig(
  year: number,
  raw: Required<Subsidio52RawParams> & { importeMensual?: number | undefined },
  status: LegalStatus,
  inheritedFrom: number | null
): Subsidio52YearConfig {
  const bruto =
    raw.importeMensual != null
      ? round2(raw.importeMensual)
      : round2(raw.iprem * raw.subsidio52);
  const notes =
    inheritedFrom != null
      ? `${year}: ficha vacía → hereda ${inheritedFrom}. Subsidio ${bruto} €/mes · base cotización ${raw.baseMinima} €.`
      : raw.importeMensual != null
        ? `${year}: ${bruto} €/mes (80% IPREM, 12 pagas). SEPE no retiene IRPF. Base cotización ${raw.baseMinima} €.`
        : `${year}: IPREM ${raw.iprem} × ${raw.subsidio52} = ${bruto} €. Base cotización ${raw.baseMinima} €.`;

  return {
    year,
    status,
    ipremMonthly: raw.iprem,
    subsidioPercentOfIprem: raw.subsidio52,
    subsidioMensualFijo: raw.importeMensual ?? null,
    baseMinimaRegimenGeneral: raw.baseMinima,
    cotizacionPercentOfMinima: raw.cotizacion52,
    irpfRetentionRate: raw.irpfDefecto,
    smiMonthly14: raw.smi,
    rentLimitPercentOfSmi: RENT_LIMIT_PCT,
    sources: [
      'lib/rules/subsidio-52-params.json',
      inheritedFrom != null ? `Heredado de ${inheritedFrom}` : `Ficha ${year}`,
    ],
    notes,
  };
}

export function getSubsidio52Config(year: number): Subsidio52YearConfig {
  const { raw, inheritedFrom, status } = resolveRawParams(year);
  const map = yearParamsMap();
  const sourceYear = inheritedFrom ?? year;
  const importeMensual = map[String(sourceYear)]?.importeMensual;
  const rawWithImporte =
    importeMensual != null ? { ...raw, importeMensual } : raw;
  return toConfig(year, rawWithImporte, status, inheritedFrom);
}

export function latestSubsidio52Year(): number {
  return Math.max(...Object.keys(yearParamsMap()).map(Number));
}

export function deriveSubsidio52Amounts(cfg: Subsidio52YearConfig) {
  const subsidioBruto =
    cfg.subsidioMensualFijo != null
      ? round2(cfg.subsidioMensualFijo)
      : round2(cfg.ipremMonthly * cfg.subsidioPercentOfIprem);
  const irpfMonthly = round2(subsidioBruto * cfg.irpfRetentionRate);
  /** SEPE no practica retención: lo que ingresa es el bruto (480 €). */
  const subsidioNeto =
    cfg.irpfRetentionRate === 0 ? subsidioBruto : round2(subsidioBruto - irpfMonthly);
  const baseCotizacion = round2(cfg.baseMinimaRegimenGeneral);
  const rentLimitMonthly = round2(cfg.smiMonthly14 * cfg.rentLimitPercentOfSmi);

  return {
    subsidioBruto,
    irpfMonthly,
    subsidioNeto,
    baseCotizacion,
    rentLimitMonthly,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

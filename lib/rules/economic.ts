/**
 * Motor de Reglas — lee economic-params.json (fuente única de importes/límites).
 * Año vacío hereda. Las fórmulas estructurales (calendario 27/2011) siguen en ss-rules.
 */
import rawFile from './economic-params.json';

export interface EconomicYearParams {
  iprem: number;
  smi: number;
  maxPensionMonthly: number;
  minPension65NoSpouse: number;
  baseMinimaRG: number;
  baseMaximaRG: number;
  subsidio52: {
    pctIprem: number;
    baseCotizacion: number;
    cotizacionPct: number;
    irpfDefecto: number;
  };
  convenioEspecial: {
    cuotaPctSobreBase: number;
    baseMinimaDefault: number;
    baseMaximaDefault: number;
  };
  irpf: { defaultRetention: number };
  expectancyYearsFrom65: number;
  pensionPct: {
    minYears: number;
    yearsFor100: number;
    basePctAt15: number;
    monthlyAddFirst102: number;
    monthlyAddAfter102: number;
    monthsFirstBand: number;
  };
  monthsForBaseReguladora: number;
  divisorBr: number;
  earlyVoluntaryMinAge: number;
  earlyVoluntaryMinMonths: number;
  delayedBonusPerYear: number;
  earlyCoefficients: {
    lessThan38y6m: number;
    between38y6mAnd41y6m: number;
    between41y6mAnd44y6m: number;
    moreThan44y6m: number;
  };
  miopWeights: {
    lifetimeBenefit: number;
    monthlyPension: number;
    lowUpfrontCost: number;
    roiBreakEven: number;
    legalStability: number;
  };
}

type RawYear = Partial<EconomicYearParams> | Record<string, never>;

function yearMap(): Record<string, RawYear> {
  const out: Record<string, RawYear> = {};
  for (const [k, v] of Object.entries(rawFile as Record<string, unknown>)) {
    if (!/^\d{4}$/.test(k)) continue;
    if (!v || typeof v !== 'object') continue;
    out[k] = v as RawYear;
  }
  return out;
}

function isFilled(p: RawYear | undefined): p is EconomicYearParams {
  if (!p || typeof p !== 'object') return false;
  return (
    'iprem' in p &&
    typeof (p as EconomicYearParams).iprem === 'number' &&
    'maxPensionMonthly' in p
  );
}

export function resolveEconomicParams(year: number): {
  params: EconomicYearParams;
  inheritedFrom: number | null;
  status: 'official' | 'provisional';
} {
  const map = yearMap();
  const years = Object.keys(map).map(Number).sort((a, b) => a - b);

  if (isFilled(map[String(year)])) {
    return {
      params: map[String(year)] as EconomicYearParams,
      inheritedFrom: null,
      status: 'official',
    };
  }

  const prior = [...years].filter((y) => y < year && isFilled(map[String(y)])).pop();
  const later = years.find((y) => y > year && isFilled(map[String(y)]));
  const src = prior ?? later;
  if (src == null) throw new Error('economic-params.json sin año con datos');

  return {
    params: map[String(src)] as EconomicYearParams,
    inheritedFrom: src,
    status: 'provisional',
  };
}

export function getEconomicParams(year = new Date().getFullYear()): EconomicYearParams {
  return resolveEconomicParams(year).params;
}

export function getActiveEconomicParams(): EconomicYearParams {
  return getEconomicParams(new Date().getFullYear());
}

export function economicParamsFingerprint(): string {
  const json = JSON.stringify(yearMap());
  let h = 0;
  for (let i = 0; i < json.length; i++) h = (Math.imul(31, h) + json.charCodeAt(i)) | 0;
  return `eco-${(h >>> 0).toString(16)}`;
}

/**
 * Motor Convenio Especial — solo reglas + números.
 * La recomendación (¿conviene?) vive en Optimización MIOP.
 */
import { resolveEconomicParams } from './economic';

export interface ConvenioEspecialQuote {
  year: number;
  baseElegida: number;
  baseMinima: number;
  baseMaxima: number;
  baseRecomendada: number;
  cuotaMensual: number;
  costeAnual: number;
  cuotaPct: number;
  status: 'official' | 'provisional';
  notes: string;
}

export function quoteConvenioEspecial(options: {
  year?: number;
  base?: number | null;
  avgDocumentedBase?: number | null;
}): ConvenioEspecialQuote {
  const year = options.year ?? new Date().getFullYear();
  const { params, status, inheritedFrom } = resolveEconomicParams(year);
  const c = params.convenioEspecial;
  const baseMinima = c.baseMinimaDefault;
  const baseMaxima = c.baseMaximaDefault;
  const avg = options.avgDocumentedBase ?? baseMinima;
  const baseRecomendada = clamp(avg, baseMinima, baseMaxima);
  const baseElegida = clamp(options.base ?? baseRecomendada, baseMinima, baseMaxima);
  const cuotaMensual = round2(baseElegida * c.cuotaPctSobreBase);
  return {
    year,
    baseElegida,
    baseMinima,
    baseMaxima,
    baseRecomendada,
    cuotaMensual,
    costeAnual: round2(cuotaMensual * 12),
    cuotaPct: c.cuotaPctSobreBase,
    status,
    notes:
      inheritedFrom != null
        ? `Convenio ${year}: params heredados de ${inheritedFrom} (provisional).`
        : `Convenio ${year}: cuota ${(c.cuotaPctSobreBase * 100).toFixed(1)}% sobre base elegida.`,
  };
}

export function convenioCostTotal(cuotaMensual: number, months: number): number {
  return round2(cuotaMensual * months);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

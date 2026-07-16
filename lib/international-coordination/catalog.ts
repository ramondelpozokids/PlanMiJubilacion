/**
 * Catálogo de países y marcos de coordinación con España.
 * Basado en fuentes oficiales Seguridad Social / CMISS (ver docs/COTIZACIONES_INTERNACIONALES_PLAN.md).
 */
import type { CountryCoordinationInfo } from './types';

const EU_EEA_CH = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'CH',
]);

/** Convenio bilateral España (listado oficial SS, 23 países). */
const BILATERAL_ES = new Set([
  'AD', 'AR', 'AU', 'BR', 'CV', 'CA', 'CL', 'CO', 'KR', 'EC', 'US', 'PH', 'JP', 'MA', 'MX',
  'PY', 'PE', 'DO', 'RU', 'TN', 'UA', 'UY', 'VE',
]);

/** Estados parte CMISS (Seguridad Social / acuerdo iberoamericano). */
const CMISS = new Set([
  'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'SV', 'ES', 'PY', 'PE', 'PT', 'DO', 'UY',
]);

const COUNTRY_NAMES: Record<string, string> = {
  AD: 'Andorra',
  AR: 'Argentina',
  AT: 'Austria',
  AU: 'Australia',
  BE: 'Bélgica',
  BO: 'Bolivia',
  BR: 'Brasil',
  BG: 'Bulgaria',
  CA: 'Canadá',
  CV: 'Cabo Verde',
  CL: 'Chile',
  CN: 'China',
  CO: 'Colombia',
  CY: 'Chipre',
  CZ: 'República Checa',
  DE: 'Alemania',
  DK: 'Dinamarca',
  DO: 'República Dominicana',
  EC: 'Ecuador',
  EE: 'Estonia',
  ES: 'España',
  FI: 'Finlandia',
  FR: 'Francia',
  GB: 'Reino Unido',
  GR: 'Grecia',
  HR: 'Croacia',
  HU: 'Hungría',
  IE: 'Irlanda',
  IS: 'Islandia',
  IT: 'Italia',
  JP: 'Japón',
  KR: 'Corea del Sur',
  LI: 'Liechtenstein',
  LT: 'Lituania',
  LU: 'Luxemburgo',
  LV: 'Letonia',
  MA: 'Marruecos',
  MT: 'Malta',
  MX: 'México',
  NL: 'Países Bajos',
  NO: 'Noruega',
  PE: 'Perú',
  PH: 'Filipinas',
  PL: 'Polonia',
  PT: 'Portugal',
  PY: 'Paraguay',
  RO: 'Rumanía',
  RU: 'Rusia',
  SE: 'Suecia',
  SI: 'Eslovenia',
  SK: 'Eslovaquia',
  SV: 'El Salvador',
  TN: 'Túnez',
  UA: 'Ucrania',
  US: 'Estados Unidos',
  UY: 'Uruguay',
  VE: 'Venezuela',
  CH: 'Suiza',
};

export function getCountryName(code: string): string {
  const c = code.toUpperCase();
  return COUNTRY_NAMES[c] ?? c;
}

export function buildCountryInfo(code: string): CountryCoordinationInfo {
  const c = code.toUpperCase();
  const euEeaCh = EU_EEA_CH.has(c);
  const bilateral = BILATERAL_ES.has(c);
  const cmiss = CMISS.has(c);
  const uk = c === 'GB';

  const frameworks: CountryCoordinationInfo['frameworks'] = [];
  if (euEeaCh) frameworks.push('eu_eea_ch');
  if (uk) frameworks.push('uk_tca');
  if (bilateral) frameworks.push('bilateral');
  if (cmiss) frameworks.push('cmiss');
  if (frameworks.length === 0) frameworks.push('none');

  return {
    code: c,
    name: getCountryName(c),
    frameworks,
    bilateralWithSpain: bilateral,
    cmissMember: cmiss,
    euEeaCh,
    ukPostBrexit: uk,
  };
}

/** Países seleccionables en el asistente (UE/EEE/CH + bilaterales + UK + otros frecuentes). */
export const SELECTABLE_COUNTRIES: Array<{ code: string; name: string }> = [
  ...[...EU_EEA_CH].filter((c) => c !== 'ES').sort().map((code) => ({
    code,
    name: getCountryName(code),
  })),
  { code: 'GB', name: 'Reino Unido' },
  ...[...BILATERAL_ES]
    .filter((c) => !EU_EEA_CH.has(c))
    .sort()
    .map((code) => ({ code, name: getCountryName(code) })),
  { code: 'OTHER', name: 'Otro país (sin convenio conocido)' },
];

export function isSpain(code: string): boolean {
  return code.toUpperCase() === 'ES';
}

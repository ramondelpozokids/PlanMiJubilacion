/**
 * Registro estático de tablas oficiales (imports JSON).
 * Generado / mantenido junto a scripts/generate-early-retirement-tables.py
 */
import type { OfficialCoefficientTableFile } from './table-schema';

import vol2024 from './tables/2024/anticipada_voluntaria.json';
import inv2024 from './tables/2024/anticipada_involuntaria.json';
import max2024 from './tables/2024/anticipada_voluntaria_sobre_maxima.json';
import vol2025 from './tables/2025/anticipada_voluntaria.json';
import inv2025 from './tables/2025/anticipada_involuntaria.json';
import max2025 from './tables/2025/anticipada_voluntaria_sobre_maxima.json';
import vol2026 from './tables/2026/anticipada_voluntaria.json';
import inv2026 from './tables/2026/anticipada_involuntaria.json';
import max2026 from './tables/2026/anticipada_voluntaria_sobre_maxima.json';
import vol2027 from './tables/2027/anticipada_voluntaria.json';
import inv2027 from './tables/2027/anticipada_involuntaria.json';
import max2027 from './tables/2027/anticipada_voluntaria_sobre_maxima.json';
import vol2028 from './tables/2028/anticipada_voluntaria.json';
import inv2028 from './tables/2028/anticipada_involuntaria.json';
import max2028 from './tables/2028/anticipada_voluntaria_sobre_maxima.json';
import vol2029 from './tables/2029/anticipada_voluntaria.json';
import inv2029 from './tables/2029/anticipada_involuntaria.json';
import max2029 from './tables/2029/anticipada_voluntaria_sobre_maxima.json';
import vol2030 from './tables/2030/anticipada_voluntaria.json';
import inv2030 from './tables/2030/anticipada_involuntaria.json';
import max2030 from './tables/2030/anticipada_voluntaria_sobre_maxima.json';
import vol2031 from './tables/2031/anticipada_voluntaria.json';
import inv2031 from './tables/2031/anticipada_involuntaria.json';
import max2031 from './tables/2031/anticipada_voluntaria_sobre_maxima.json';
import vol2032 from './tables/2032/anticipada_voluntaria.json';
import inv2032 from './tables/2032/anticipada_involuntaria.json';
import max2032 from './tables/2032/anticipada_voluntaria_sobre_maxima.json';
import vol2033 from './tables/2033/anticipada_voluntaria.json';
import inv2033 from './tables/2033/anticipada_involuntaria.json';
import max2033 from './tables/2033/anticipada_voluntaria_sobre_maxima.json';
import vol2034 from './tables/2034/anticipada_voluntaria.json';
import inv2034 from './tables/2034/anticipada_involuntaria.json';
import vol2035 from './tables/2035/anticipada_voluntaria.json';
import inv2035 from './tables/2035/anticipada_involuntaria.json';

export type { OfficialCoefficientTableFile } from './table-schema';

export const VOLUNTARY_TABLES: Record<string, OfficialCoefficientTableFile> = {
  '2024': vol2024 as OfficialCoefficientTableFile,
  '2025': vol2025 as OfficialCoefficientTableFile,
  '2026': vol2026 as OfficialCoefficientTableFile,
  '2027': vol2027 as OfficialCoefficientTableFile,
  '2028': vol2028 as OfficialCoefficientTableFile,
  '2029': vol2029 as OfficialCoefficientTableFile,
  '2030': vol2030 as OfficialCoefficientTableFile,
  '2031': vol2031 as OfficialCoefficientTableFile,
  '2032': vol2032 as OfficialCoefficientTableFile,
  '2033': vol2033 as OfficialCoefficientTableFile,
  '2034': vol2034 as OfficialCoefficientTableFile,
  '2035': vol2035 as OfficialCoefficientTableFile,
};

export const INVOLUNTARY_TABLES: Record<string, OfficialCoefficientTableFile> = {
  '2024': inv2024 as OfficialCoefficientTableFile,
  '2025': inv2025 as OfficialCoefficientTableFile,
  '2026': inv2026 as OfficialCoefficientTableFile,
  '2027': inv2027 as OfficialCoefficientTableFile,
  '2028': inv2028 as OfficialCoefficientTableFile,
  '2029': inv2029 as OfficialCoefficientTableFile,
  '2030': inv2030 as OfficialCoefficientTableFile,
  '2031': inv2031 as OfficialCoefficientTableFile,
  '2032': inv2032 as OfficialCoefficientTableFile,
  '2033': inv2033 as OfficialCoefficientTableFile,
  '2034': inv2034 as OfficialCoefficientTableFile,
  '2035': inv2035 as OfficialCoefficientTableFile,
};

export const VOLUNTARY_OVER_MAX_TABLES: Record<string, OfficialCoefficientTableFile> = {
  '2024': max2024 as OfficialCoefficientTableFile,
  '2025': max2025 as OfficialCoefficientTableFile,
  '2026': max2026 as OfficialCoefficientTableFile,
  '2027': max2027 as OfficialCoefficientTableFile,
  '2028': max2028 as OfficialCoefficientTableFile,
  '2029': max2029 as OfficialCoefficientTableFile,
  '2030': max2030 as OfficialCoefficientTableFile,
  '2031': max2031 as OfficialCoefficientTableFile,
  '2032': max2032 as OfficialCoefficientTableFile,
  '2033': max2033 as OfficialCoefficientTableFile,
};

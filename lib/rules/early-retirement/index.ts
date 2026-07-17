/**
 * Jubilación anticipada — motor desacoplado de tablas BOE.
 *
 * Flujo: ordinaria → fecha elegida → meses de adelanto → modalidad → tramo → lookup tabla → aplicar %.
 * Para cambiar la ley: actualizar JSON en `tables/YYYY/` (script: scripts/generate-early-retirement-tables.py).
 */

export * from './types';
export * from './anticipation';
export * from './brackets';
export * from './tables';
export * from './resolve';

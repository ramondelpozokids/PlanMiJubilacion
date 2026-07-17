/**
 * Carga tablas oficiales JSON (sin inventar porcentajes).
 */
import type { CareerBracketId, CoefficientTableKind } from './types';
import type { OfficialCoefficientTableFile } from './table-schema';
import {
  INVOLUNTARY_TABLES,
  VOLUNTARY_OVER_MAX_TABLES,
  VOLUNTARY_TABLES,
} from './table-registry';

function pickYear(
  map: Record<string, OfficialCoefficientTableFile>,
  year: number
): OfficialCoefficientTableFile {
  if (map[String(year)]) return map[String(year)]!;
  const keys = Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b);
  const prior = [...keys].filter((y) => y <= year).pop();
  if (prior != null) return map[String(prior)]!;
  return map[String(keys[0]!)]!;
}

export function getOfficialTable(
  kind: CoefficientTableKind,
  year: number
): OfficialCoefficientTableFile {
  if (kind === 'voluntary') return pickYear(VOLUNTARY_TABLES, year);
  if (kind === 'involuntary') return pickYear(INVOLUNTARY_TABLES, year);
  if (year >= 2034) return pickYear(VOLUNTARY_TABLES, year);
  return pickYear(VOLUNTARY_OVER_MAX_TABLES, year);
}

/**
 * Lee el coeficiente oficial (%) para (modalidad, año, meses, tramo).
 * Nunca calcula: solo lookup. Si monthsEarly > max, usa maxMonths.
 */
export function lookupOfficialReductionPercent(opts: {
  kind: CoefficientTableKind;
  year: number;
  monthsEarly: number;
  bracketId: CareerBracketId;
}): {
  reductionPercent: number;
  monthsEarlyUsed: number;
  legalBasis: string;
  boeRef: string;
  tableYear: number;
} {
  const table = getOfficialTable(opts.kind, opts.year);
  if (opts.monthsEarly <= 0) {
    return {
      reductionPercent: 0,
      monthsEarlyUsed: 0,
      legalBasis: table.legalBasis,
      boeRef: table.boeRef,
      tableYear: table.year,
    };
  }

  const monthsEarlyUsed = Math.min(Math.max(1, opts.monthsEarly), table.maxMonths);
  const row = table.byMonthsEarly[String(monthsEarlyUsed)];
  if (!row) {
    throw new Error(
      `Tabla ${opts.kind} ${table.year}: falta fila meses=${monthsEarlyUsed}`
    );
  }
  const reductionPercent = row[opts.bracketId];
  if (typeof reductionPercent !== 'number') {
    throw new Error(
      `Tabla ${opts.kind} ${table.year}: falta tramo ${opts.bracketId} en mes ${monthsEarlyUsed}`
    );
  }

  return {
    reductionPercent,
    monthsEarlyUsed,
    legalBasis: table.legalBasis,
    boeRef: table.boeRef,
    tableYear: table.year,
  };
}

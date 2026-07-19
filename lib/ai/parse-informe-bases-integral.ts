/**
 * Parser del «Informe Integral de Bases de Cotización» (SS online).
 * Formato real: fila `YYYY v1 v2 … v12` bajo cabecera Enero…Diciembre.
 */
import { parseBasesFromText, type ParsedBaseRow as LegacyRow } from './parse-bases-cotizacion';

export interface ParsedBaseRow {
  periodo: string; // MM/YYYY
  base: number;
  regimen: string | null;
  empresa: string | null;
}

function parseSpanishAmount(raw: string): number | null {
  const t = raw.trim();
  if (!t || t === '---' || /^pendiente/i.test(t)) return null;
  const cleaned = t
    .replace(/[€\s*]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n > 500_000) return null;
  return Math.round(n * 100) / 100;
}

function toPeriod(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${year}`;
}

/** Normaliza celdas multilínea del PDF online SS. */
function normalizeIntegralText(text: string): string {
  return text
    .replace(/Sin\s+base\s*\r?\n\s*registrada/gi, '---')
    .replace(/Sin\s+base\s+registrada/gi, '---')
    .replace(/Pendiente\s*\r?\n\s*de\s+actualizar/gi, 'pendiente')
    .replace(/Pendiente\s+de\s+actualizar/gi, 'pendiente');
}

function countMonthSlots(rest: string): number {
  const tokens = rest.split(/\s+/).filter(Boolean);
  let n = 0;
  for (const tok of tokens) {
    if (tok === '---' || tok === '--') {
      n++;
      continue;
    }
    if (/^pendiente$/i.test(tok)) break;
    if (/^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(tok) || /^\d+,\d{2}$/.test(tok)) {
      n++;
      continue;
    }
  }
  return n;
}

function isYearRowStop(line: string): boolean {
  return (
    /^((?:19|20)\d{2})\s+/.test(line) ||
    /^R[ée]gimen:/i.test(line) ||
    /^Enero\s+Febrero/i.test(line) ||
    /^--\s+\d+\s+of/i.test(line) ||
    /^(INFORME|REFERENCIA|Página|Datos|Apellidos|La |Las |Código|Sede)/i.test(line)
  );
}

/** Une continuaciones de fila (p. ej. "Sin base" / "registrada" en líneas siguientes). */
function coalesceYearRows(lines: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const yearMatch = line.match(/^((?:19|20)\d{2})\s+(.*)$/);
    if (!yearMatch) {
      out.push(line);
      i++;
      continue;
    }
    let rest = yearMatch[2];
    let j = i + 1;
    while (j < lines.length && countMonthSlots(rest) < 12) {
      const next = lines[j];
      if (isYearRowStop(next) && /^((?:19|20)\d{2})\s+/.test(next)) break;
      if (isYearRowStop(next) && !/^(---|--|\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|pendiente|registrada|Sin|base)/i.test(next)) {
        break;
      }
      if (/^R[ée]gimen:/i.test(next) || /^Enero\s+Febrero/i.test(next) || /^--\s+\d+\s+of/i.test(next)) {
        break;
      }
      if (/^(INFORME|REFERENCIA|Página|Datos|Apellidos)/i.test(next)) break;
      rest = `${rest} ${next}`;
      j++;
    }
    out.push(`${yearMatch[1]} ${rest}`);
    i = j;
  }
  return out;
}

/**
 * Extrae bases del informe integral SS (tablas por empresa/año).
 * Si hay varios regímenes/empresas el mismo mes, se suma.
 */
export function parseInformeIntegralBases(
  text: string,
  asOf: Date = new Date()
): ParsedBaseRow[] {
  if (!text?.trim()) return [];

  const byPeriod = new Map<string, { base: number; regimen: string | null; empresa: string | null }>();
  const lines = coalesceYearRows(
    normalizeIntegralText(text)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
  );

  let regimen: string | null = null;
  let empresa: string | null = null;

  const add = (month: number, year: number, amount: number) => {
    if (month < 1 || month > 12 || year < 1950 || year > 2100) return;
    if (year > asOf.getFullYear()) return;
    if (year === asOf.getFullYear() && month > asOf.getMonth() + 1) return;

    const periodo = toPeriod(month, year);
    const prev = byPeriod.get(periodo);
    if (!prev) {
      byPeriod.set(periodo, { base: amount, regimen, empresa });
    } else {
      byPeriod.set(periodo, {
        base: Math.round((prev.base + amount) * 100) / 100,
        regimen: prev.regimen ?? regimen,
        empresa:
          prev.empresa && empresa && prev.empresa !== empresa
            ? 'varios'
            : prev.empresa ?? empresa,
      });
    }
  };

  for (const line of lines) {
    const regMatch = line.match(/^R[ée]gimen:\s*(.+?)(?:\s+Empresa|$)/i);
    if (regMatch) {
      regimen = regMatch[1].trim();
      const emp = line.match(/Empresa\/Raz[oó]n Social:\s*(.+?)(?:\s+CCC:|$)/i);
      empresa = emp?.[1]?.trim() ?? null;
      continue;
    }

    const yearMatch = line.match(/^((?:19|20)\d{2})\s+(.+)$/);
    if (!yearMatch) continue;
    const year = Number(yearMatch[1]);
    const tokens = yearMatch[2].split(/\s+/).filter(Boolean);
    let month = 1;
    for (let i = 0; i < tokens.length && month <= 12; ) {
      const tok = tokens[i];
      if (tok === '---' || tok === '--') {
        month++;
        i++;
        continue;
      }
      if (/^pendiente$/i.test(tok)) break;
      if (/^sin$/i.test(tok) && /^base$/i.test(tokens[i + 1] ?? '')) {
        // residual "Sin base" sin normalizar
        month++;
        i += tokens[i + 2] && /^registrada$/i.test(tokens[i + 2]) ? 3 : 2;
        continue;
      }
      if (/^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(tok) || /^\d+,\d{2}$/.test(tok)) {
        const amount = parseSpanishAmount(tok);
        if (amount != null) add(month, year, amount);
        month++;
        i++;
        continue;
      }
      i++;
    }
  }

  return [...byPeriod.entries()]
    .map(([periodo, v]) => ({
      periodo,
      base: v.base,
      regimen: v.regimen,
      empresa: v.empresa,
    }))
    .sort((a, b) => {
      const [am, ay] = a.periodo.split('/').map(Number);
      const [bm, by] = b.periodo.split('/').map(Number);
      return ay !== by ? ay - by : am - bm;
    });
}

/**
 * Combina parser integral + legado MM/YYYY.
 * Si el texto es informe integral (rejilla Enero…Diciembre), no mezclar legado.
 */
export function parseAllBasesFromText(
  text: string,
  asOf: Date = new Date()
): ParsedBaseRow[] {
  const integral = parseInformeIntegralBases(text, asOf);
  const looksIntegral =
    /informe\s+integral\s+de\s+bases|Enero\s+Febrero\s+Marzo\s+Abril/i.test(text);
  if (looksIntegral && integral.length > 0) return integral;
  if (integral.length >= 24) return integral;

  const legacy: ParsedBaseRow[] = parseBasesFromText(text).map((r: LegacyRow) => ({
    periodo: r.periodo,
    base: r.base,
    regimen: r.regimen,
    empresa: null,
  }));

  const map = new Map<string, ParsedBaseRow>();
  for (const r of legacy) map.set(r.periodo, r);
  for (const r of integral) map.set(r.periodo, r);
  return [...map.values()].sort((a, b) => {
    const [am, ay] = a.periodo.split('/').map(Number);
    const [bm, by] = b.periodo.split('/').map(Number);
    return ay !== by ? ay - by : am - bm;
  });
}

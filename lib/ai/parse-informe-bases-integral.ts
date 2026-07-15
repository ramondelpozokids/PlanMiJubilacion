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

/**
 * Extrae bases del informe integral SS (tablas por empresa/año).
 * Si hay varios regímenes/empresas el mismo mes, se suma.
 */
export function parseInformeIntegralBases(text: string): ParsedBaseRow[] {
  if (!text?.trim()) return [];

  const byPeriod = new Map<string, { base: number; regimen: string | null; empresa: string | null }>();
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  let regimen: string | null = null;
  let empresa: string | null = null;

  const add = (month: number, year: number, amount: number) => {
    if (month < 1 || month > 12 || year < 1950 || year > 2100) return;
    const now = new Date();
    if (year > now.getFullYear()) return;
    if (year === now.getFullYear() && month > now.getMonth() + 1) return;

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

/** Combina parser integral + parser legado MM/YYYY. Integral gana. */
export function parseAllBasesFromText(text: string): ParsedBaseRow[] {
  const integral = parseInformeIntegralBases(text);
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

/**
 * Parser determinista de Informes de Bases de Cotización (texto PDF).
 * Complementa/rescata cuando la IA no rellena basesCotizacion.
 */

export interface ParsedBaseRow {
  periodo: string; // MM/YYYY
  base: number;
  regimen: string | null;
}

function parseSpanishAmount(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/[€\s]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n > 500000) return null;
  return Math.round(n * 100) / 100;
}

const MONTH_ES: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

function toPeriod(month: number, year: number): string | null {
  if (month < 1 || month > 12 || year < 1950 || year > 2100) return null;
  return `${String(month).padStart(2, '0')}/${year}`;
}

/** Extrae filas mes + base del texto OCR del informe. */
export function parseBasesFromText(text: string): ParsedBaseRow[] {
  if (!text?.trim()) return [];
  const byPeriod = new Map<string, ParsedBaseRow>();

  const push = (periodo: string | null, amountRaw: string, regimen: string | null = null) => {
    if (!periodo) return;
    const base = parseSpanishAmount(amountRaw);
    if (base == null) return;
    // Preferir valor más alto si hay duplicados (a veces trae CC + contingencias)
    const prev = byPeriod.get(periodo);
    if (!prev || base >= prev.base) {
      byPeriod.set(periodo, { periodo, base, regimen });
    }
  };

  // 01/2020  1.234,56  |  01-2020 1234,56 | 01.2020
  const reNumPeriod = /(\d{2})[\/\-.](\d{4})(?:\s+|\s*[|;]\s*)(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d{3,6}(?:[.,]\d{2})?)/g;
  let m: RegExpExecArray | null;
  while ((m = reNumPeriod.exec(text)) !== null) {
    push(toPeriod(Number(m[1]), Number(m[2])), m[3]);
  }

  // 2020-01 1234.56
  const reIso = /(\d{4})-(\d{2})(?:\s+|\s*[|;]\s*)(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d{3,6}(?:[.,]\d{2})?)/g;
  while ((m = reIso.exec(text)) !== null) {
    push(toPeriod(Number(m[2]), Number(m[1])), m[3]);
  }

  // julio 2020 ... 1.234,56
  const reNamed =
    /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s*(?:de\s*)?(\d{4})[^\d]{0,40}(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/gi;
  while ((m = reNamed.exec(text)) !== null) {
    const mm = MONTH_ES[m[1].toLowerCase()];
    if (mm) push(`${mm}/${m[2]}`, m[3]);
  }

  // Líneas tipo: 01/2024 GENERAL 2.450,00
  const lineRe =
    /^.*?(\d{2})[\/\-.](\d{4}).*?(general|aut[oó]nomos?|agrario|hogar)?[^\d]*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\s*$/gim;
  while ((m = lineRe.exec(text)) !== null) {
    push(toPeriod(Number(m[1]), Number(m[2])), m[4], m[3] ?? null);
  }

  return [...byPeriod.values()].sort((a, b) => {
    const [am, ay] = a.periodo.split('/').map(Number);
    const [bm, by] = b.periodo.split('/').map(Number);
    return ay !== by ? ay - by : am - bm;
  });
}

export function mergeParsedBasesIntoExtraction(
  existing: Array<{ periodo: string | null; base: number | null; regimen: string | null }>,
  parsed: ParsedBaseRow[]
): Array<{ periodo: string | null; base: number | null; regimen: string | null }> {
  const map = new Map<string, { periodo: string | null; base: number | null; regimen: string | null }>();
  for (const b of existing) {
    if (b.periodo && b.base != null) map.set(b.periodo, b);
  }
  for (const p of parsed) {
    if (!map.has(p.periodo)) {
      map.set(p.periodo, { periodo: p.periodo, base: p.base, regimen: p.regimen });
    }
  }
  return [...map.values()];
}

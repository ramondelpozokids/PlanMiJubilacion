/**
 * Fallback regex para resoluciones SEPE/INSS y certificados cuando la IA deja campos vacíos.
 */
export interface ParsedResolucionHint {
  fecha: string | null;
  importe: number | null;
  numeroExpediente: string | null;
  organismo: string | null;
  resumen: string | null;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(raw: string): string | null {
  const m = raw.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
}

export function parseResolucionFromText(text: string): ParsedResolucionHint {
  const t = text.replace(/\s+/g, ' ');

  const expediente =
    t.match(/(?:n[ºo°]?\s*(?:de\s*)?expediente|expediente)\s*[:.]?\s*([A-Z0-9\/\-.]+)/i)?.[1] ??
    t.match(/SPEE\.CERTIFICADO\.(\d+)/i)?.[1] ??
    null;

  const fecha =
    normalizeDate(
      t.match(
        /(?:fecha\s+(?:de\s+)?(?:la\s+)?resoluci[oó]n|fecha\s+efecto|fecha\s+emisi[oó]n|madrid,?\s*)[:\s]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/i
      )?.[1] ??
        t.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/)?.[1] ??
        ''
    ) ?? null;

  const importeRaw =
    t.match(
      /(?:importe\s+(?:mensual|bruto)?|cuant[ií]a|prestaci[oó]n\s+de)\s*[:.]?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\s*€?/i
    )?.[1] ??
    t.match(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*€/)?.[1] ??
    null;

  const organismo = /SEPE|SPEE|servicio\s+p[uú]blico\s+de\s+empleo/i.test(t)
    ? 'SEPE'
    : /INSS|instituto\s+nacional\s+de\s+la\s+seguridad/i.test(t)
      ? 'INSS'
      : /TGSS|tesorer[ií]a/i.test(t)
        ? 'TGSS'
        : null;

  const resumen =
    t.match(/(?:resuelve|resuelvo|acuerda|certifica)\s*[:.]?\s*(.{20,160})/i)?.[1]?.trim() ?? null;

  return {
    fecha,
    importe: importeRaw ? parseAmount(importeRaw) : null,
    numeroExpediente: expediente,
    organismo,
    resumen: resumen ? resumen.replace(/\s+/g, ' ').slice(0, 200) : null,
  };
}

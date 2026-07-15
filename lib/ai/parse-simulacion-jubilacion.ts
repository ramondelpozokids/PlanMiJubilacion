/**
 * Parser del PDF «Simulación de jubilación» SS.
 * Formato real observado:
 *   Fecha jubilación: 02/08/2032
 *   Edad real...: 65 años ... Importe de la pensión: 3.475,36 €/mes
 *   Base Reguladora 3.475,36 €
 */
export interface ParsedSimulacionOficial {
  edadJubilacion: number | null;
  fechaJubilacion: string | null;
  pensionMensual: number | null;
  pensionAnual: number | null;
  baseReguladora: number | null;
  anosCotizados: number | null;
  mesesCotizados: number | null;
  porcentaje: number | null;
  diasCotizacion: number | null;
  modalidad: string | null;
}

function parseAmount(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[€\s]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function parseDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
}

export function parseSimulacionFromText(text: string): ParsedSimulacionOficial {
  const compact = text.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ');

  const fechaJubilacion = parseDate(
    compact.match(/Fecha\s+jubilaci[oó]n\s*:\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/i)?.[1]
  );

  const edadRaw = compact.match(
    /Edad\s+real\s+en\s+la\s+fecha\s+de\s+jubilaci[oó]n\s*:\s*(\d{1,2})\s*a[ñn]os/i
  )?.[1];
  const edadJubilacion = edadRaw ? Number(edadRaw) : null;

  const pensionMensual =
    parseAmount(
      compact.match(/Importe\s+de\s+la\s+pensi[oó]n\s*:\s*([\d.\s]+,\d{2})\s*€?\s*\/\s*mes/i)?.[1]
    ) ??
    parseAmount(
      compact.match(/Importe\s+pensi[oó]n\s+total[^=]*=\s*[^\d]*([\d.\s]+,\d{2})/i)?.[1]
    ) ??
    parseAmount(
      compact.match(/Pensi[oó]n\s+inicial\s*=\s*[^\d]*([\d.\s]+,\d{2})/i)?.[1]
    );

  const baseReguladora =
    parseAmount(
      compact.match(/Base\s+Reguladora(?:\s+a\s+aplicar)?[^\d]{0,80}([\d.\s]+,\d{2})\s*euros?/i)?.[1]
    ) ??
    parseAmount(compact.match(/Base\s+Reguladora\s+([\d.\s]+,\d{2})\s*€/i)?.[1]);

  const porcentajeRaw = compact.match(
    /Por\s+a[ñn]os\s+computables\s+a\s+efectos\s+de\s+porcentaje\s+([\d.,]+)\s*%/i
  )?.[1];
  const porcentaje = porcentajeRaw ? Number(porcentajeRaw.replace(',', '.')) : null;

  const anosComp = compact.match(
    /A[ñn]os\s+computables\s+a\s+efectos\s+de\s+porcentaje\s+([\d.,]+)\s*a[ñn]os/i
  )?.[1];
  let anosCotizados: number | null = null;
  let mesesCotizados: number | null = null;
  if (anosComp) {
    const years = Number(anosComp.replace(',', '.'));
    if (Number.isFinite(years)) {
      anosCotizados = Math.floor(years);
      mesesCotizados = Math.round((years - anosCotizados) * 12);
    }
  }

  const diasRaw = compact.match(
    /Durante\s+toda\s+la\s+vida\s+laboral\s+([\d.]+)\s*d[ií]as/i
  )?.[1];
  const diasCotizacion = diasRaw
    ? Number(diasRaw.replace(/\./g, ''))
    : null;

  const modalidad =
    compact.match(/Modalidad\s+de\s+jubilaci[oó]n\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? null;

  return {
    edadJubilacion:
      edadJubilacion != null && edadJubilacion >= 60 && edadJubilacion <= 75
        ? edadJubilacion
        : null,
    fechaJubilacion,
    pensionMensual,
    pensionAnual: pensionMensual != null ? Math.round(pensionMensual * 14 * 100) / 100 : null,
    baseReguladora,
    anosCotizados,
    mesesCotizados,
    porcentaje,
    diasCotizacion: Number.isFinite(diasCotizacion as number) ? diasCotizacion : null,
    modalidad,
  };
}

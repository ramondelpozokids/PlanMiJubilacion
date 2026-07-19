import { parseAllBasesFromText } from '@/lib/ai/parse-informe-bases-integral';
import { mergeParsedBasesIntoExtraction } from '@/lib/ai/parse-bases-cotizacion';
import { isContributionMonthOnOrBeforeToday, parseDmy } from '@/lib/expediente/sanitize';
import type { FullDocumentExtraction } from '@/lib/ai/vida-laboral-types';
import type { DocumentTypeKey } from '@/lib/expediente/document-types';

/** Fecha del informe de bases (cabecera) o de la VL ya enrichada. */
function resolveBasesAsOf(ocr: FullDocumentExtraction): Date {
  const fromResumen = parseDmy(ocr.informeCompleto.resumen.fechaInforme);
  if (fromResumen) return fromResumen;
  const m = ocr.rawText?.match(/Fecha:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (m) {
    const d = parseDmy(m[1]);
    if (d) return d;
  }
  return new Date();
}

/**
 * Completa basesCotizacion desde el texto del PDF (informe integral SS).
 */
export function enrichBasesFromRawText(
  ocr: FullDocumentExtraction,
  documentType: DocumentTypeKey
): FullDocumentExtraction {
  const shouldParse =
    documentType === 'bases_cotizacion' ||
    ocr.informeCompleto.basesCotizacion.length < 50 ||
    /informe\s+integral\s+de\s+bases|bases\s+de\s+cotizaci/i.test(ocr.rawText ?? '');

  if (!shouldParse || !ocr.rawText?.trim()) return ocr;

  const asOf = resolveBasesAsOf(ocr);
  const parsed = parseAllBasesFromText(ocr.rawText, asOf).filter((b) =>
    isContributionMonthOnOrBeforeToday(b.periodo, asOf)
  );
  if (parsed.length === 0) return ocr;

  const merged = mergeParsedBasesIntoExtraction(
    ocr.informeCompleto.basesCotizacion,
    parsed
  ).filter((b) => isContributionMonthOnOrBeforeToday(b.periodo, asOf));

  const last = merged[merged.length - 1];

  return {
    ...ocr,
    informeCompleto: {
      ...ocr.informeCompleto,
      basesCotizacion: merged,
      otrosDatos: {
        ...ocr.informeCompleto.otrosDatos,
        basesDesdeTexto: parsed.length,
        basesLayout: 'informe_integral',
        basesAsOf: `${String(asOf.getDate()).padStart(2, '0')}/${String(asOf.getMonth() + 1).padStart(2, '0')}/${asOf.getFullYear()}`,
      },
    },
    basesUltimos24: merged
      .map((b) => b.base)
      .filter((b): b is number => b != null)
      .slice(-24),
    baseMensual: last?.base ?? ocr.baseMensual,
  };
}

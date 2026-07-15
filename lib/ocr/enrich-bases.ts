import { parseAllBasesFromText } from '@/lib/ai/parse-informe-bases-integral';
import { mergeParsedBasesIntoExtraction } from '@/lib/ai/parse-bases-cotizacion';
import { isContributionMonthOnOrBeforeToday } from '@/lib/expediente/sanitize';
import type { FullDocumentExtraction } from '@/lib/ai/vida-laboral-types';
import type { DocumentTypeKey } from '@/lib/expediente/document-types';

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

  const parsed = parseAllBasesFromText(ocr.rawText).filter((b) =>
    isContributionMonthOnOrBeforeToday(b.periodo)
  );
  if (parsed.length === 0) return ocr;

  const merged = mergeParsedBasesIntoExtraction(
    ocr.informeCompleto.basesCotizacion,
    parsed
  ).filter((b) => isContributionMonthOnOrBeforeToday(b.periodo));

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
      },
    },
    basesUltimos24: merged
      .map((b) => b.base)
      .filter((b): b is number => b != null)
      .slice(-24),
    baseMensual: last?.base ?? ocr.baseMensual,
  };
}

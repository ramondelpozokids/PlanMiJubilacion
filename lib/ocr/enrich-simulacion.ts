import { parseSimulacionFromText } from '@/lib/ai/parse-simulacion-jubilacion';
import type { FullDocumentExtraction } from '@/lib/ai/vida-laboral-types';
import type { DocumentTypeKey } from '@/lib/expediente/document-types';

/**
 * Completa otrosDatos.simulacion desde el texto OCR del PDF oficial SS.
 */
export function enrichSimulacionFromRawText(
  ocr: FullDocumentExtraction,
  documentType: DocumentTypeKey
): FullDocumentExtraction {
  const looksLikeSim =
    documentType === 'simulacion_jubilacion' ||
    /informe\s+de\s+simulaci[oó]n\s+de\s+jubilaci[oó]n|importe\s+de\s+la\s+pensi[oó]n\s*:/i.test(
      ocr.rawText ?? ''
    );

  if (!looksLikeSim || !ocr.rawText?.trim()) return ocr;

  const parsed = parseSimulacionFromText(ocr.rawText);
  const existing = (ocr.informeCompleto.otrosDatos.simulacion as Record<string, unknown>) ?? {};

  const asNum = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;
  const asStr = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v : null;

  const merged = {
    edadJubilacion: asNum(existing.edadJubilacion) ?? parsed.edadJubilacion ?? null,
    fechaJubilacion: asStr(existing.fechaJubilacion) ?? parsed.fechaJubilacion ?? null,
    pensionMensual: asNum(existing.pensionMensual) ?? parsed.pensionMensual ?? null,
    pensionAnual: asNum(existing.pensionAnual) ?? parsed.pensionAnual ?? null,
    baseReguladora: asNum(existing.baseReguladora) ?? parsed.baseReguladora ?? null,
    anosCotizados: asNum(existing.anosCotizados) ?? parsed.anosCotizados ?? null,
    mesesCotizados: asNum(existing.mesesCotizados) ?? parsed.mesesCotizados ?? null,
    porcentaje: asNum(existing.porcentaje) ?? parsed.porcentaje ?? null,
    diasCotizacion: asNum(existing.diasCotizacion) ?? parsed.diasCotizacion ?? null,
    modalidad: asStr(existing.modalidad) ?? parsed.modalidad ?? null,
    origen: 'simulacion_oficial_ss',
  };

  return {
    ...ocr,
    informeCompleto: {
      ...ocr.informeCompleto,
      resumen: {
        ...ocr.informeCompleto.resumen,
        anosCotizados:
          ocr.informeCompleto.resumen.anosCotizados ?? merged.anosCotizados,
        mesesCotizados:
          ocr.informeCompleto.resumen.mesesCotizados ?? merged.mesesCotizados,
        totalDiasCotizacion:
          ocr.informeCompleto.resumen.totalDiasCotizacion ?? merged.diasCotizacion,
      },
      otrosDatos: {
        ...ocr.informeCompleto.otrosDatos,
        simulacion: merged,
      },
    },
    baseMensual:
      typeof merged.pensionMensual === 'number' ? merged.pensionMensual : ocr.baseMensual,
  };
}

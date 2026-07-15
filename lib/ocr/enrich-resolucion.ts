import { parseResolucionFromText } from '@/lib/ai/parse-resolucion';
import type { FullDocumentExtraction } from '@/lib/ai/vida-laboral-types';
import type { DocumentTypeKey } from '@/lib/expediente/document-types';

const RESOLUTION_TYPES: DocumentTypeKey[] = [
  'resolucion_sepe',
  'resolucion_inss',
  'certificado_empresa',
  'prestacion_desempleo',
  'subsidio',
];

/**
 * Completa otrosDatos.resolucion / importes desde texto OCR si la IA dejó huecos.
 */
export function enrichResolucionFromRawText(
  ocr: FullDocumentExtraction,
  documentType: DocumentTypeKey
): FullDocumentExtraction {
  if (!RESOLUTION_TYPES.includes(documentType) && !/SEPE|INSS|certific/i.test(ocr.rawText ?? '')) {
    return ocr;
  }
  if (!ocr.rawText?.trim()) return ocr;

  const parsed = parseResolucionFromText(ocr.rawText);
  const otros = { ...ocr.informeCompleto.otrosDatos };
  const existing = (otros.resolucion as Record<string, unknown> | undefined) ?? {};

  otros.resolucion = {
    organismo: existing.organismo ?? parsed.organismo ?? (documentType.includes('sepe') ? 'SEPE' : undefined),
    numeroExpediente: existing.numeroExpediente ?? parsed.numeroExpediente ?? undefined,
    fecha: existing.fecha ?? parsed.fecha ?? undefined,
    tipo: existing.tipo ?? documentType,
    resumen: existing.resumen ?? parsed.resumen ?? undefined,
    importe: existing.importe ?? parsed.importe ?? undefined,
  };

  if (parsed.importe != null && otros.importe == null) {
    otros.importe = parsed.importe;
  }
  if (parsed.numeroExpediente && otros.numeroExpediente == null) {
    otros.numeroExpediente = parsed.numeroExpediente;
  }

  const resumenFecha = ocr.informeCompleto.resumen.fechaInforme ?? parsed.fecha;

  return {
    ...ocr,
    informeCompleto: {
      ...ocr.informeCompleto,
      resumen: {
        ...ocr.informeCompleto.resumen,
        fechaInforme: resumenFecha,
      },
      otrosDatos: otros,
    },
  };
}

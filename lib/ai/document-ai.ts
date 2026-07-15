/**
 * Punto de entrada OCR — delega en el registry de extractores.
 */
import {
  extractByDocumentType,
  isGoogleDocumentAiConfigured,
} from '@/lib/extractors';
import {
  countFullExtractionFields,
  isFullDocumentExtraction,
  type FullDocumentExtraction,
} from '@/lib/ai/vida-laboral-types';
import { cleanPersonName } from '@/lib/ai/parse-seg-social';
import { normalizeDocumentType } from '@/lib/expediente/document-types';

export type OCRExtractedData = FullDocumentExtraction;

export { isFullDocumentExtraction, countFullExtractionFields, isGoogleDocumentAiConfigured };

export async function processDocumentWithOCR(
  fileBuffer: Buffer,
  mimeType: string,
  documentType = 'vida_laboral'
): Promise<OCRExtractedData> {
  return extractByDocumentType({
    fileBuffer,
    mimeType,
    documentType: normalizeDocumentType(documentType),
  });
}

/** @deprecated Usar countFullExtractionFields */
export function countExtractedFields(data: FullDocumentExtraction): number {
  return countFullExtractionFields(data);
}

export function ocrDataToDisplay(data: FullDocumentExtraction | null | undefined) {
  if (!data) return null;
  const id = data.informeCompleto.identificacion;
  return {
    full_name: cleanPersonName(id.nombre ?? data.nombre),
    age: id.edad ?? data.edad,
    regimen: data.informeCompleto.resumen.regimenPrincipal ?? data.regimen,
    current_company: data.empresa,
    monthly_base: data.baseMensual,
    years_contributed: data.anosCotizados,
    months_contributed: data.mesesCotizados,
    confidence: data.confidence,
  };
}

export function mergeDisplayData(
  fromDb: {
    full_name?: string | null;
    age?: number | null;
    regimen?: string | null;
    current_company?: string | null;
    monthly_base?: number | null;
    years_contributed?: number | null;
    months_contributed?: number | null;
    confidence?: number | null;
  } | null,
  fromOcr: ReturnType<typeof ocrDataToDisplay>
) {
  const pick = <T>(a: T | null | undefined, b: T | null | undefined) =>
    a != null && a !== '' ? a : (b ?? null);

  return {
    full_name: pick(fromOcr?.full_name, fromDb?.full_name),
    age: pick(fromOcr?.age, fromDb?.age),
    regimen: pick(fromOcr?.regimen, fromDb?.regimen),
    current_company: pick(fromOcr?.current_company, fromDb?.current_company),
    monthly_base: pick(fromOcr?.monthly_base, fromDb?.monthly_base),
    years_contributed: pick(fromOcr?.years_contributed, fromDb?.years_contributed),
    months_contributed: pick(fromOcr?.months_contributed, fromDb?.months_contributed),
    confidence: pick(fromOcr?.confidence, fromDb?.confidence),
  };
}

export function hasUsefulExtractedData(data: {
  full_name?: string | null;
  age?: number | null;
  regimen?: string | null;
  monthly_base?: number | null;
  years_contributed?: number | null;
  months_contributed?: number | null;
}): boolean {
  if (data.full_name) return true;
  return Boolean(
    data.age != null ||
      data.monthly_base != null ||
      data.years_contributed != null ||
      data.regimen
  );
}

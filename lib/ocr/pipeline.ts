/**
 * Pipeline OCR — orquestador desacoplado.
 * OCR → Extracción → Normalización → Merge expediente → Validación cruzada
 */
import { processDocumentWithOCR, type OCRExtractedData } from '@/lib/ai/document-ai';
import { isFullDocumentExtraction } from '@/lib/ai/vida-laboral-types';
import {
  detectDocumentTypeFromText,
  normalizeDocumentType,
  type DocumentTypeKey,
} from '@/lib/expediente/document-types';
import { normalizeByDocumentType } from '@/lib/expediente/normalize';
import type { NormalizedDocumentPayload } from '@/lib/expediente/normalize';
import { applyCrossValidation } from '@/lib/validation';
import { mergeDocumentIntoExpediente } from '@/lib/expediente/merge';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { emptyExpediente } from '@/lib/expediente/types';
import { loadExpediente, saveExpediente } from '@/lib/expediente/repository';
import { finalizeExpediente } from '@/lib/expediente/finalize';
import { recalculateFromExpediente } from '@/lib/calculator/recalculate';
import { enrichBasesFromRawText } from '@/lib/ocr/enrich-bases';
import { enrichResolucionFromRawText } from '@/lib/ocr/enrich-resolucion';
import { enrichSimulacionFromRawText } from '@/lib/ocr/enrich-simulacion';
import { hashDocumentContent } from '@/lib/ocr/content-hash';

export interface PipelineInput {
  userId: string;
  documentId: string;
  documentName: string;
  documentTypeHint: string;
  fileBuffer: Buffer;
  mimeType: string;
}

export interface PipelineResult {
  ocrData: OCRExtractedData;
  detectedType: DocumentTypeKey;
  normalized: NormalizedDocumentPayload;
  expediente: ExpedienteDigital;
}

async function extractDocument(
  buffer: Buffer,
  mimeType: string,
  typeHint: DocumentTypeKey
): Promise<{ ocr: OCRExtractedData; detectedType: DocumentTypeKey }> {
  const ocr = await processDocumentWithOCR(buffer, mimeType, typeHint);
  const rawText = ocr.rawText ?? '';
  const detected =
    typeHint === 'otro'
      ? detectDocumentTypeFromText(rawText, '')
      : typeHint;

  if (detected !== typeHint && rawText.length > 200) {
    const reOcr = await processDocumentWithOCR(buffer, mimeType, detected);
    return { ocr: reOcr, detectedType: detected };
  }

  return { ocr, detectedType: typeHint };
}

function normalizeExtraction(
  ocr: OCRExtractedData,
  documentId: string,
  documentName: string,
  documentType: DocumentTypeKey
): NormalizedDocumentPayload {
  if (!isFullDocumentExtraction(ocr)) {
    throw new Error('Formato de extracción incompatible');
  }

  switch (documentType) {
    case 'vida_laboral':
    case 'bases_cotizacion':
    case 'nomina':
    case 'resolucion_inss':
    case 'resolucion_sepe':
    case 'prestacion_desempleo':
    case 'subsidio':
    case 'certificado_empresa':
    case 'simulacion_jubilacion':
    case 'convenio_especial':
    case 'incapacidad_temporal':
    case 'incapacidad_permanente':
    case 'certificado_europeo':
    case 'declaracion_fiscal':
    case 'otro':
      return normalizeByDocumentType(ocr, documentId, documentName, documentType);
    default:
      return normalizeByDocumentType(ocr, documentId, documentName, documentType);
  }
}

export async function runDocumentPipeline(input: PipelineInput): Promise<PipelineResult> {
  const typeHint = normalizeDocumentType(input.documentTypeHint);

  const { ocr: ocrRaw, detectedType } = await extractDocument(
    input.fileBuffer,
    input.mimeType,
    typeHint
  );

  const ocr = enrichSimulacionFromRawText(
    enrichResolucionFromRawText(enrichBasesFromRawText(ocrRaw, detectedType), detectedType),
    detectedType
  );

  const normalized = normalizeExtraction(
    ocr,
    input.documentId,
    input.documentName,
    detectedType
  );

  let expediente = await loadExpediente(input.userId);
  if (!expediente) expediente = emptyExpediente(input.userId);

  expediente = mergeDocumentIntoExpediente(
    expediente,
    normalized,
    input.documentId,
    input.documentName
  );
  expediente = applyCrossValidation(expediente);
  expediente = await finalizeExpediente(expediente, input.documentName);
  await saveExpediente(expediente);
  // Cálculo separado del OCR: escribe scenarios a partir del expediente SoT
  await recalculateFromExpediente(input.userId, expediente);

  return { ocrData: ocr, detectedType, normalized, expediente };
}

export async function rebuildExpedienteFromDocuments(userId: string): Promise<ExpedienteDigital> {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: docs } = await supabase
    .from('documents')
    .select('id, name, document_type, ocr_data, ocr_status')
    .eq('user_id', userId)
    .eq('ocr_status', 'completed')
    .order('created_at', { ascending: true });

  let expediente = emptyExpediente(userId);

  for (const doc of docs ?? []) {
    let ocr = doc.ocr_data;
    if (!isFullDocumentExtraction(ocr)) continue;

    const docType = normalizeDocumentType(doc.document_type);
    ocr = enrichSimulacionFromRawText(
      enrichResolucionFromRawText(enrichBasesFromRawText(ocr, docType), docType),
      docType
    );
    const normalized = normalizeExtraction(ocr, doc.id, doc.name, docType);
    expediente = mergeDocumentIntoExpediente(expediente, normalized, doc.id, doc.name);
  }

  expediente = applyCrossValidation(expediente);
  expediente = await finalizeExpediente(expediente);
  await saveExpediente(expediente);
  await recalculateFromExpediente(userId, expediente);
  return expediente;
}

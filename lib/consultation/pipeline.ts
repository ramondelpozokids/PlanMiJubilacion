/**
 * Pipeline OCR para consultas de fundador (expediente en consultation_cases).
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
import { finalizeExpediente } from '@/lib/expediente/finalize';
import { enrichBasesFromRawText } from '@/lib/ocr/enrich-bases';
import { enrichResolucionFromRawText } from '@/lib/ocr/enrich-resolucion';
import { enrichSimulacionFromRawText } from '@/lib/ocr/enrich-simulacion';
import { enrichVidaLaboralFromRawText } from '@/lib/ocr/enrich-vida-laboral';
import {
  getConsultationCase,
  saveConsultationExpediente,
} from '@/lib/consultation/repository';
import { createClient } from '@/lib/supabase/server';
import {
  isReplaceableDocumentType,
  listSameTypeDocuments,
  stripDocumentsFromExpediente,
  type SameTypeDocRow,
} from '@/lib/documents/replace-same-type';

export interface ConsultationPipelineInput {
  founderId: string;
  caseId: string;
  documentId: string;
  documentName: string;
  documentTypeHint: string;
  fileBuffer: Buffer;
  mimeType: string;
}

async function extractDocument(
  buffer: Buffer,
  mimeType: string,
  typeHint: DocumentTypeKey
): Promise<{ ocr: OCRExtractedData; detectedType: DocumentTypeKey }> {
  const ocr = await processDocumentWithOCR(buffer, mimeType, typeHint);
  const rawText = ocr.rawText ?? '';
  const detected =
    typeHint === 'otro' ? detectDocumentTypeFromText(rawText, '') : typeHint;

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
  return normalizeByDocumentType(ocr, documentId, documentName, documentType);
}

export async function runConsultationPipeline(
  input: ConsultationPipelineInput
): Promise<{
  expediente: ExpedienteDigital;
  ocr: OCRExtractedData;
  detectedType: DocumentTypeKey;
  replacedDocs: SameTypeDocRow[];
}> {
  const typeHint = normalizeDocumentType(input.documentTypeHint);
  const caseRow = await getConsultationCase(input.caseId, input.founderId);
  if (!caseRow) throw new Error('Consulta no encontrada');

  const { ocr: ocrRaw, detectedType } = await extractDocument(
    input.fileBuffer,
    input.mimeType,
    typeHint
  );

  const ocr = enrichSimulacionFromRawText(
    enrichResolucionFromRawText(
      enrichBasesFromRawText(
        enrichVidaLaboralFromRawText(ocrRaw, detectedType),
        detectedType
      ),
      detectedType
    ),
    detectedType
  );

  const normalized = normalizeExtraction(
    ocr,
    input.documentId,
    input.documentName,
    detectedType
  );

  let expediente = caseRow.expediente?.documentIds
    ? caseRow.expediente
    : emptyExpediente(input.founderId);

  let replacedDocs: SameTypeDocRow[] = [];
  if (isReplaceableDocumentType(detectedType)) {
    const supabase = await createClient();
    replacedDocs = await listSameTypeDocuments(supabase, {
      userId: input.founderId,
      documentType: detectedType,
      consultationCaseId: input.caseId,
      excludeDocumentId: input.documentId,
    });
    if (replacedDocs.length > 0) {
      expediente = stripDocumentsFromExpediente(
        expediente,
        replacedDocs.map((d) => d.id)
      );
    }
  }

  expediente = mergeDocumentIntoExpediente(
    expediente,
    normalized,
    input.documentId,
    input.documentName
  );
  expediente = applyCrossValidation(expediente);
  expediente = await finalizeExpediente(expediente, input.documentName);

  await saveConsultationExpediente(input.caseId, input.founderId, expediente);
  return { expediente, ocr, detectedType, replacedDocs };
}

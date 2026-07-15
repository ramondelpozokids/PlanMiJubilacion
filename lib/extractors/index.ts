/**
 * Registry de extractores — un punto de entrada por tipo documental.
 * Todos producen FullDocumentExtraction (modelo canónico de extracción).
 */
import type { DocumentTypeKey } from '@/lib/expediente/document-types';
import type { FullDocumentExtraction } from '@/lib/ai/vida-laboral-types';
import {
  extractFullDocumentFromPdf,
  extractFullDocumentFromImage,
} from '@/lib/ai/vida-laboral-full';
import { extractTextWithDocumentAi } from './google-document-ai';
import { getExtractionPromptForType } from './type-prompts';

export interface ExtractorInput {
  fileBuffer: Buffer;
  mimeType: string;
  documentType: DocumentTypeKey;
}

export async function extractByDocumentType(
  input: ExtractorInput
): Promise<FullDocumentExtraction> {
  const { fileBuffer, mimeType, documentType } = input;

  // Document AI: pre-texto estructurado cuando está configurado (PDF/imagen)
  const dai = await extractTextWithDocumentAi(fileBuffer, mimeType);

  if (mimeType === 'application/pdf') {
    const result = await extractFullDocumentFromPdf(fileBuffer, documentType);
    if (dai?.text && dai.text.length > (result.rawText?.length ?? 0)) {
      // Preferimos texto Document AI si es más completo; la visión/IA ya corrió
      return { ...result, rawText: dai.text, confidence: Math.max(result.confidence, dai.confidence) };
    }
    return result;
  }

  if (mimeType.startsWith('image/')) {
    return extractFullDocumentFromImage(fileBuffer, mimeType, documentType);
  }

  throw new Error(`Formato no soportado: ${mimeType}`);
}

export function describeExtractor(documentType: DocumentTypeKey): string {
  return getExtractionPromptForType(documentType);
}

export { getExtractionPromptForType } from './type-prompts';
export { isGoogleDocumentAiConfigured } from './google-document-ai';

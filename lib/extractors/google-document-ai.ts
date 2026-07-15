/**
 * Extracción con Google Document AI cuando está configurado.
 * Fallback: el caller usa OpenAI OCR.
 */
export function isGoogleDocumentAiConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_PROJECT_ID?.trim() &&
      process.env.GOOGLE_LOCATION?.trim() &&
      process.env.GOOGLE_PROCESSOR_ID?.trim()
  );
}

export async function extractTextWithDocumentAi(
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ text: string; confidence: number } | null> {
  if (!isGoogleDocumentAiConfigured()) return null;

  try {
    const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai');
    const projectId = process.env.GOOGLE_PROJECT_ID!;
    const location = process.env.GOOGLE_LOCATION!;
    const processorId = process.env.GOOGLE_PROCESSOR_ID!;

    const client = new DocumentProcessorServiceClient();
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    const [result] = await client.processDocument({
      name,
      rawDocument: {
        content: fileBuffer.toString('base64'),
        mimeType,
      },
    });

    const text = result.document?.text ?? '';
    if (!text.trim()) return null;

    return { text, confidence: 0.9 };
  } catch (err) {
    console.warn('Document AI no disponible, se usará OpenAI OCR:', err);
    return null;
  }
}

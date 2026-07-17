/**
 * Extracción de texto PDF compatible con Vercel/serverless.
 * Usa unpdf (sin DOMMatrix / canvas) — ruta principal fiable.
 */
export async function extractPdfText(fileBuffer: Buffer): Promise<{
  text: string;
  totalPages: number;
}> {
  const { extractText } = await import('unpdf');
  const result = await extractText(new Uint8Array(fileBuffer), { mergePages: true });
  const text = typeof result.text === 'string' ? result.text : String(result.text ?? '');
  return {
    text: text.trim(),
    totalPages: result.totalPages || 1,
  };
}

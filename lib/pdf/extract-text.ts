/**
 * Extracción de texto PDF con el mismo motor que usa el fundador:
 * pdf-parse + worker + CanvasFactory (@napi-rs/canvas).
 */
export async function extractPdfText(fileBuffer: Buffer): Promise<{
  text: string;
  totalPages: number;
}> {
  const { createPdfParser } = await import('@/lib/pdf/create-parser');
  const parser = await createPdfParser(fileBuffer);
  try {
    const result = await parser.getText();
    return {
      text: (result.text || '').trim(),
      totalPages: result.total || 1,
    };
  } finally {
    await parser.destroy();
  }
}

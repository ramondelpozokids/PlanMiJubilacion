/**
 * PDFParse listo para Node/Vercel (mismo flujo que extrajo bien los PDF del fundador).
 * Orden docs pdf-parse: worker + CanvasFactory antes de usar PDFParse.
 */
export async function createPdfParser(fileBuffer: Buffer) {
  const canvas = await import('@napi-rs/canvas');
  const g = globalThis as Record<string, unknown>;
  g.DOMMatrix ??= canvas.DOMMatrix as unknown;
  g.ImageData ??= canvas.ImageData as unknown;
  g.Path2D ??= canvas.Path2D as unknown;

  const { CanvasFactory, getData } = await import('pdf-parse/worker');
  const { PDFParse } = await import('pdf-parse');

  try {
    PDFParse.setWorker(getData());
  } catch {
    /* worker ya configurado */
  }

  return new PDFParse({
    data: new Uint8Array(fileBuffer),
    CanvasFactory,
  });
}

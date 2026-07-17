/**
 * Crea un PDFParse listo para Node/Vercel.
 * Orden crítico (docs pdf-parse): worker + CanvasFactory ANTES de usar PDFParse.
 */
export async function createPdfParser(fileBuffer: Buffer) {
  // Polyfill explícito por si el worker no llega a inyectar globals en serverless
  const canvas = await import('@napi-rs/canvas');
  const g = globalThis as typeof globalThis & {
    DOMMatrix?: unknown;
    ImageData?: unknown;
    Path2D?: unknown;
  };
  g.DOMMatrix ??= canvas.DOMMatrix;
  g.ImageData ??= canvas.ImageData;
  g.Path2D ??= canvas.Path2D;

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

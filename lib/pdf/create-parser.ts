/**
 * Crea un PDFParse listo para Node/Vercel.
 * Orden crítico (docs pdf-parse): worker + CanvasFactory ANTES de usar PDFParse.
 */
export async function createPdfParser(fileBuffer: Buffer) {
  // Polyfill explícito por si el worker no llega a inyectar globals en serverless.
  // Cast a unknown: los tipos de @napi-rs/canvas no coinciden 1:1 con DOM lib.
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

/**
 * Crea un PDFParse listo para Node/Vercel.
 * Debe cargar `pdf-parse/worker` ANTES que `pdf-parse` para polyfillar DOMMatrix.
 */
export async function createPdfParser(fileBuffer: Buffer) {
  await import('pdf-parse/worker');
  const { PDFParse } = await import('pdf-parse');
  return new PDFParse({ data: new Uint8Array(fileBuffer) });
}

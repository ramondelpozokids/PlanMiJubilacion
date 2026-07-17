/**
 * PDFParse para Node/Vercel — mismo motor que extrajo los PDF del fundador.
 * Canvas nativo si existe; si no, stub mínimo para no tumbar getText().
 */
function ensureDomMatrixStub() {
  const g = globalThis as Record<string, unknown>;
  if (g.DOMMatrix) return;
  g.DOMMatrix = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    multiplySelf() {
      return this;
    }
    invertSelf() {
      return this;
    }
    translateSelf() {
      return this;
    }
    scaleSelf() {
      return this;
    }
    rotateSelf() {
      return this;
    }
  };
}

export async function createPdfParser(fileBuffer: Buffer) {
  let CanvasFactory: unknown | undefined;
  try {
    const canvas = await import('@napi-rs/canvas');
    const g = globalThis as Record<string, unknown>;
    g.DOMMatrix ??= canvas.DOMMatrix as unknown;
    g.ImageData ??= canvas.ImageData as unknown;
    g.Path2D ??= canvas.Path2D as unknown;
    const worker = await import('pdf-parse/worker');
    CanvasFactory = worker.CanvasFactory;
    try {
      const { PDFParse } = await import('pdf-parse');
      PDFParse.setWorker(worker.getData());
    } catch {
      /* worker ya configurado */
    }
  } catch (err) {
    console.warn('canvas nativo no disponible, stub DOMMatrix:', err);
    ensureDomMatrixStub();
    await import('pdf-parse/worker').catch(() => undefined);
  }

  const { PDFParse } = await import('pdf-parse');
  return new PDFParse({
    data: new Uint8Array(fileBuffer),
    ...(CanvasFactory ? { CanvasFactory } : {}),
  });
}

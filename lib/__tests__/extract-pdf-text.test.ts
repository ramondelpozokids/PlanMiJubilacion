import { describe, expect, it } from 'vitest';
import { extractPdfText } from '@/lib/pdf/extract-text';

/** PDF mínimo con texto "HelloPdf" */
function minimalPdf(): Buffer {
  return Buffer.from(`%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 44 >>stream
BT /F1 24 Tf 100 100 Td (HelloPdf) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000362 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
441
%%EOF`);
}

describe('extractPdfText', () => {
  it(
    'extrae texto con pdf-parse + CanvasFactory',
    async () => {
      const { text, totalPages } = await extractPdfText(minimalPdf());
      expect(totalPages).toBe(1);
      expect(text).toContain('HelloPdf');
    },
    20_000
  );
});

import { describe, expect, it } from 'vitest';
import { parseResolucionFromText } from '@/lib/ai/parse-resolucion';
import { hashDocumentContent } from '@/lib/ocr/content-hash';

describe('parseResolucionFromText', () => {
  it('extrae fecha, importe y SEPE de texto típico', () => {
    const text = `
      SERVICIO PÚBLICO DE EMPLEO ESTATAL SEPE
      Número de expediente: 11428038/2024
      Fecha de la resolución: 15/03/2024
      Importe mensual: 1.234,56 €
      Resuelve: reconocer la prestación contributiva por desempleo.
    `;
    const r = parseResolucionFromText(text);
    expect(r.organismo).toBe('SEPE');
    expect(r.fecha).toBe('15/03/2024');
    expect(r.importe).toBe(1234.56);
    expect(r.numeroExpediente).toContain('11428038');
  });
});

describe('hashDocumentContent', () => {
  it('es estable para el mismo buffer', () => {
    const a = hashDocumentContent(Buffer.from('hola'));
    const b = hashDocumentContent(Buffer.from('hola'));
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});

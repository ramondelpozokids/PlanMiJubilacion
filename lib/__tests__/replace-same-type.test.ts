import { describe, expect, it } from 'vitest';
import {
  dbTypesForReplaceable,
  isReplaceableDocumentType,
  stripDocumentsFromExpediente,
} from '@/lib/documents/replace-same-type';
import { emptyExpediente } from '@/lib/expediente/types';

describe('replace same-type documents', () => {
  it('solo vida laboral y bases son reemplazables', () => {
    expect(isReplaceableDocumentType('vida_laboral')).toBe(true);
    expect(isReplaceableDocumentType('bases')).toBe(true);
    expect(isReplaceableDocumentType('bases_cotizacion')).toBe(true);
    expect(isReplaceableDocumentType('nomina')).toBe(false);
    expect(dbTypesForReplaceable('bases_cotizacion')).toEqual(['bases_cotizacion', 'bases']);
  });

  it('stripDocumentsFromExpediente quita periodos/bases del doc antiguo', () => {
    const exp = emptyExpediente('u1');
    exp.documentIds = ['old-vl', 'keep-bases'];
    exp.periodos.push({
      id: 'p1',
      fechaAlta: { value: '01/01/2020', sources: [] },
      fechaBaja: null,
      empresa: { value: 'ACME', sources: [] },
      regimen: null,
      tipoContrato: null,
      categoria: null,
      grupoCotizacion: null,
      cnae: null,
      dias: null,
      salario: null,
      baseCotizacion: null,
      sources: [{ documentId: 'old-vl', documentName: 'vl.pdf', documentType: 'vida_laboral' }],
    } as never);
    exp.bases.push({
      id: 'b1',
      periodo: { value: '2024-01', sources: [] },
      base: { value: 2000, sources: [] },
      regimen: null,
      empresa: null,
      sources: [
        {
          documentId: 'keep-bases',
          documentName: 'bases.pdf',
          documentType: 'bases_cotizacion',
          extractedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    const next = stripDocumentsFromExpediente(exp, ['old-vl']);
    expect(next.documentIds).toEqual(['keep-bases']);
    expect(next.periodos).toHaveLength(0);
    expect(next.bases).toHaveLength(1);
  });
});

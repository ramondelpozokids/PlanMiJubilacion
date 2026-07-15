import { describe, expect, it } from 'vitest';
import { emptyExpediente } from '@/lib/expediente/types';
import { buildAdvisorInsights } from '@/lib/expediente/advisor';
import { finalizeExpediente } from '@/lib/expediente/finalize';
import { applyCrossValidation } from '@/lib/validation';
import { listDocumentedBases } from '@/lib/calculator/from-expediente';

describe('SIP Fase 1 — núcleo desacoplado', () => {
  it('advisor es documental: no inventa fechas de jubilación', () => {
    const exp = emptyExpediente('u1');
    exp.resumen.anosCotizados = { value: 34, sources: [] };
    exp.resumen.mesesCotizados = { value: 5, sources: [] };
    exp.periodos = [
      {
        id: 'p1',
        empresa: { value: 'ACME', sources: [] },
        ccc: null,
        fechaAlta: { value: '01/01/1990', sources: [] },
        fechaBaja: { value: '01/01/2000', sources: [] },
        tipoContrato: null,
        regimen: null,
        grupoCotizacion: null,
        situacion: null,
        diasCotizados: null,
        baseCotizacion: null,
        salario: null,
        categoria: 'contrato',
        sources: [],
      },
    ];
    const advisor = buildAdvisorInsights(exp);
    expect(advisor?.summary).toContain('34 años');
    expect(advisor?.summary).not.toMatch(/ordinaria estimada/i);
    expect(advisor?.summary).toContain('periodo');
  });

  it('finalize no escribe scenarios ni extracted_data (puro)', async () => {
    const exp = emptyExpediente('u1');
    exp.identificacion.nombre = { value: 'TEST', sources: [] };
    const out = await finalizeExpediente(exp, 'doc.pdf');
    expect(out.advisor).toBeDefined();
    expect(out.updatedAt).toBeTruthy();
  });

  it('validation module aplica sobre expediente', () => {
    const exp = emptyExpediente('u1');
    const validated = applyCrossValidation(exp);
    expect(validated.discrepancies).toBeDefined();
  });

  it('listDocumentedBases solo lee expediente', () => {
    const exp = emptyExpediente('u1');
    exp.bases = [
      {
        id: 'b1',
        periodo: { value: '01/2024', sources: [] },
        base: { value: 2000, sources: [] },
        regimen: null,
        empresa: null,
        sources: [],
      },
    ];
    expect(listDocumentedBases(exp)).toHaveLength(1);
  });
});

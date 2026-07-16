import { describe, expect, it } from 'vitest';
import {
  deriveSubsidio52Amounts,
  getSubsidio52Config,
  resolveRawParams,
} from '@/lib/rules/subsidio-52';
import {
  buildSubsidio52ErpPipeline,
  previewYearOverrideEffect,
  SUBSIDIO_PIPELINE_STEPS,
} from '@/lib/calculator/subsidio-52-pipeline';
import { emptyExpediente } from '@/lib/expediente/types';

describe('cadena ERP', () => {
  it('pasos fijos: bruto→neto→base→impacto→comparativa→informe', () => {
    expect([...SUBSIDIO_PIPELINE_STEPS]).toEqual([
      'bruto',
      'neto',
      'baseCotizacion',
      'impactoJubilacion',
      'comparativa',
      'informe',
    ]);
  });

  it('bruto = 480 €/mes (80% IPREM, importe fijo JSON)', () => {
    const d = deriveSubsidio52Amounts(getSubsidio52Config(2026));
    expect(d.subsidioBruto).toBe(480);
    expect(d.subsidioNeto).toBe(480);
    expect(d.baseCotizacion).toBe(1780.62);
  });

  it('2028 vacío hereda; override 2028 cambiaría cifras', () => {
    expect(resolveRawParams(2028).inheritedFrom).toBe(2026);
    const preview = previewYearOverrideEffect(2028, {
      iprem: 700,
      smi: 1400,
      baseMinima: 1900,
      subsidio52: 0.95,
      cotizacion52: 1.25,
      irpfDefecto: 0,
    });
    expect(preview.bruto).toBe(665);
    expect(preview.baseCotizacion).toBe(1900);
  });

  it('pipeline construye comparativa + informe', () => {
    const exp = emptyExpediente('u1');
    exp.identificacion.fechaNacimiento = { value: '02/08/1967', sources: [] };
    exp.resumen.anosCotizados = { value: 34, sources: [] };
    exp.resumen.mesesCotizados = { value: 5, sources: [] };
    const pipe = buildSubsidio52ErpPipeline({
      expediente: exp,
      retirementDate: new Date(2032, 7, 2),
      freezeRetirementDate: new Date(2034, 7, 2),
      pensionWithPath: 2000,
    });
    expect(pipe.informe.steps).toHaveLength(6);
    expect(pipe.informe.formulaBruto).toMatch(/IPREM/);
    expect(pipe.comparativa.tuEscenario.subsidioBruto).toBe(480);
    expect(pipe.comparativa.tuEscenario.pensionMensual).toBe(2000);
    expect(pipe.paramsFingerprint).toMatch(/^s52-/);
  });
});

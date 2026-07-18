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

  it('bruto = 480 €/mes; cotiza 125% del tope mínimo 1.424,40 = 1.780,50 (Orden PJC/297/2026 + LGSS 280.3)', () => {
    const cfg = getSubsidio52Config(2026);
    expect(cfg.baseMinimaRegimenGeneral).toBe(1424.4);
    expect(cfg.cotizacionPercentOfMinima).toBe(1.25);
    const d = deriveSubsidio52Amounts(cfg);
    expect(d.subsidioBruto).toBe(480);
    expect(d.subsidioNeto).toBe(480);
    expect(d.baseMinima).toBe(1424.4);
    expect(d.baseCotizacion).toBe(1780.5);
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
    expect(preview.baseCotizacion).toBe(2375); // 1900 × 1.25
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

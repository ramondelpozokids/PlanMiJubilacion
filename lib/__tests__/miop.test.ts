import { describe, expect, it } from 'vitest';
import { getActiveSsRules } from '@/lib/rules/ss-rules';
import { getEconomicParams, economicParamsFingerprint } from '@/lib/rules/economic';
import { quoteConvenioEspecial } from '@/lib/rules/convenio-especial';
import { emptyExpediente } from '@/lib/expediente/types';
import { generateMiopStrategies, strategyFromFreeKnobs } from '@/lib/optimization/generate';
import { runMiop, runMiopSweep } from '@/lib/optimization/run';
import { evaluateScenario } from '@/lib/calculator/evaluate';

describe('Motor Económico', () => {
  it('ss-rules lee maxPension desde economic-params.json', () => {
    const eco = getEconomicParams(2026);
    expect(getActiveSsRules(2026).maxPensionMonthly).toBe(eco.maxPensionMonthly);
    expect(eco.maxPensionMonthly).toBe(3267.6);
    expect(economicParamsFingerprint()).toMatch(/^eco-/);
  });

  it('convenio cotiza % sobre base del JSON', () => {
    const q = quoteConvenioEspecial({ year: 2026, base: 1780.5 });
    expect(q.cuotaMensual).toBeCloseTo(1780.5 * 0.283, 1);
  });
});

function sample() {
  const exp = emptyExpediente('u1');
  exp.identificacion.fechaNacimiento = { value: '02/08/1967', sources: [] };
  exp.resumen.anosCotizados = { value: 34, sources: [] };
  exp.resumen.mesesCotizados = { value: 5, sources: [] };
  for (let i = 0; i < 36; i++) {
    const y = 2023 + Math.floor(i / 12);
    const m = String((i % 12) + 1).padStart(2, '0');
    exp.bases.push({
      id: `b${i}`,
      periodo: { value: `${m}/${y}`, sources: [] },
      base: { value: 2800 + i * 5, sources: [] },
      regimen: null,
      empresa: null,
      sources: [],
    });
  }
  return exp;
}

describe('MIOP grid + rank', () => {
  it('standard genera decenas/cientos', () => {
    const strategies = generateMiopStrategies(sample(), new Date('2026-07-15'), 'standard');
    expect(strategies.length).toBeGreaterThan(40);
    expect(strategies.some((s) => s.path === 'subsidio52')).toBe(true);
    expect(strategies.some((s) => s.path === 'subsidio52_convenio')).toBe(true);
  });

  it('dense genera mucho más que standard (barrido M4)', () => {
    const std = generateMiopStrategies(sample(), new Date('2026-07-15'), 'standard');
    const dense = generateMiopStrategies(sample(), new Date('2026-07-15'), 'dense');
    expect(dense.length).toBeGreaterThan(std.length * 3);
    expect(dense.length).toBeGreaterThan(400);
  });

  it('runMiop standard devuelve podio', () => {
    const result = runMiop(sample(), new Date('2026-07-15'), 'standard');
    expect(result.mode).toBe('standard');
    expect(result.strategiesEvaluated).toBeGreaterThan(20);
    expect(result.podium.length).toBeLessThanOrEqual(3);
    expect(result.conclusions[0]).toMatch(/Mejor estrategia|bases/i);
  });

  it('runMiopSweep dense evalúa en chunks async', async () => {
    const result = await runMiopSweep(sample(), {
      mode: 'dense',
      asOf: new Date('2026-07-15'),
    });
    expect(result.mode).toBe('dense');
    expect(result.strategiesGenerated).toBeGreaterThan(400);
    expect(result.strategiesEvaluated).toBeGreaterThan(100);
    expect(result.elapsedMs).toBeGreaterThan(0);
    expect(result.podium.length).toBeGreaterThan(0);
  }, 60_000);
});

describe('simulador libre → evaluate', () => {
  it('knobs libres llegan a evaluateScenario', () => {
    const s = strategyFromFreeKnobs({
      path: 'subsidio52',
      retirementDate: '2032-08-02',
      irpfRetention: 0.1,
      expectancyYearsFrom65: 22,
      inflationAnnual: 0.02,
      subsidioMayores52From: '2027-02',
      futureMonthlyBase: 1780.5,
    });
    const o = evaluateScenario(sample(), s, new Date('2026-07-15'));
    expect(o).not.toBeNull();
    expect(s.irpfRetention).toBe(0.1);
    if (o!.pensionMensual != null) {
      expect(o!.pensionNeto).toBeCloseTo(o!.pensionMensual * 0.9, 0);
    }
  });
});

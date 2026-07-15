import { describe, expect, it } from 'vitest';
import { getActiveSsRules } from '@/lib/rules/ss-rules';
import { getEconomicParams, economicParamsFingerprint } from '@/lib/rules/economic';
import { quoteConvenioEspecial } from '@/lib/rules/convenio-especial';
import { emptyExpediente } from '@/lib/expediente/types';
import { generateMiopStrategies } from '@/lib/optimization/generate';
import { runMiop } from '@/lib/optimization/run';

describe('Motor Económico', () => {
  it('ss-rules lee maxPension desde economic-params.json', () => {
    const eco = getEconomicParams(2026);
    expect(getActiveSsRules(2026).maxPensionMonthly).toBe(eco.maxPensionMonthly);
    expect(eco.maxPensionMonthly).toBe(3267.6);
    expect(economicParamsFingerprint()).toMatch(/^eco-/);
  });

  it('convenio cotiza % sobre base del JSON', () => {
    const q = quoteConvenioEspecial({ year: 2026, base: 1780.62 });
    expect(q.cuotaMensual).toBeCloseTo(1780.62 * 0.283, 1);
  });
});

describe('MIOP grid + rank', () => {
  function sample() {
    const exp = emptyExpediente('u1');
    exp.identificacion.fechaNacimiento = { value: '02/08/1967', sources: [] };
    exp.resumen.anosCotizados = { value: 34, sources: [] };
    exp.resumen.mesesCotizados = { value: 5, sources: [] };
    for (let i = 0; i < 36; i++) {
      const d = new Date(2023, i % 12, 1);
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
      void d;
    }
    return exp;
  }

  it('genera decenas/cientos de estrategias (ambos: path Ramón + grid)', () => {
    const strategies = generateMiopStrategies(sample(), new Date('2026-07-15'));
    expect(strategies.length).toBeGreaterThan(40);
    expect(strategies.some((s) => s.path === 'subsidio52')).toBe(true);
    expect(strategies.some((s) => s.path === 'subsidio52_convenio')).toBe(true);
    expect(strategies.some((s) => s.path === 'freeze')).toBe(true);
  });

  it('runMiop devuelve podio y conclusiones', () => {
    const result = runMiop(sample(), new Date('2026-07-15'));
    expect(result.strategiesEvaluated).toBeGreaterThan(20);
    expect(result.podium.length).toBeLessThanOrEqual(3);
    expect(result.conclusions.length).toBeGreaterThan(0);
    expect(result.conclusions[0]).toMatch(/Mejor estrategia|bases/i);
  });
});

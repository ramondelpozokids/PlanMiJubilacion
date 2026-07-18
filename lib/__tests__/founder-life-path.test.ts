import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIFE_PATH,
  FOUNDER_SEPE_BASE_FROM,
  FOUNDER_SEPE_BASE_MENSUAL,
  FOUNDER_SUBSIDIO_52_FROM,
  desempleoBaseForMonth,
  projectedBaseForMonth,
  describeLifePathTramos,
} from '@/lib/calculator/life-path';
import { buildBasesSeries } from '@/lib/calculator/real-pension';
import { emptyExpediente } from '@/lib/expediente/types';

describe('founder life-path Ramón → jubilación 2032', () => {
  it('DEFAULT: paro SEPE 3357 hasta ene/2027 y subsidio +52 desde feb/2027', () => {
    expect(DEFAULT_LIFE_PATH.desempleoBaseAntesSubsidio).toBe(FOUNDER_SEPE_BASE_MENSUAL);
    expect(DEFAULT_LIFE_PATH.desempleoBaseFrom).toBe(FOUNDER_SEPE_BASE_FROM);
    expect(DEFAULT_LIFE_PATH.subsidioMayores52From).toBe(FOUNDER_SUBSIDIO_52_FROM);
  });

  it('tramo paro: ene/2026–ene/2027 a 3357; feb/2027 ya no', () => {
    expect(desempleoBaseForMonth(2026, 1, DEFAULT_LIFE_PATH)).toBe(3357);
    expect(desempleoBaseForMonth(2026, 5, DEFAULT_LIFE_PATH)).toBe(3357);
    expect(desempleoBaseForMonth(2027, 1, DEFAULT_LIFE_PATH)).toBe(3357);
    expect(desempleoBaseForMonth(2027, 2, DEFAULT_LIFE_PATH)).toBe(0);
    expect(desempleoBaseForMonth(2025, 12, DEFAULT_LIFE_PATH)).toBe(0);
  });

  it('proyección futura: ago/2026 paro; mar/2027 subsidio oficial', () => {
    const asOf = new Date(2026, 6, 18); // 18 jul 2026
    expect(projectedBaseForMonth(2026, 8, DEFAULT_LIFE_PATH, asOf)).toBe(3357);
    expect(projectedBaseForMonth(2027, 1, DEFAULT_LIFE_PATH, asOf)).toBe(3357);
    const sub = projectedBaseForMonth(2027, 3, DEFAULT_LIFE_PATH, asOf);
    expect(sub).toBeGreaterThan(1700);
    expect(sub).toBeLessThan(1900);
  });

  it('buildBasesSeries rellena huecos SEPE jun–jul 2026 y proyecta hasta 2032', () => {
    const exp = emptyExpediente('ramon');
    exp.identificacion.fechaNacimiento = { value: '02/08/1967', sources: [] };
    // Solo documentado hasta mayo (como el informe)
    for (const m of [1, 2, 3, 4, 5]) {
      exp.bases.push({
        id: `b-2026-${m}`,
        periodo: { value: `2026-${String(m).padStart(2, '0')}`, sources: [] },
        base: { value: 3357, sources: [] },
        regimen: { value: 'RG', sources: [] },
        empresa: { value: 'SEPE', sources: [] },
        sources: [],
      });
    }
    const asOf = new Date(2026, 6, 18);
    const retirement = new Date(2032, 7, 2);
    const series = buildBasesSeries(exp, retirement, DEFAULT_LIFE_PATH, asOf);
    expect(series.documentedUsed).toBe(5);
    // Jun 2026 (índice relativo al final BR): debe estar en la serie como 3357
    expect(series.bases).toContain(3357);
    expect(series.projectedUsed).toBeGreaterThan(50);
    expect(series.note).toMatch(/3357/);
  });

  it('describe tramos para la UI', () => {
    const t = describeLifePathTramos(DEFAULT_LIFE_PATH);
    expect(t.paro).toMatch(/3\.357|3357/);
    expect(t.subsidio).toMatch(/Subsidio \+52/);
  });
});

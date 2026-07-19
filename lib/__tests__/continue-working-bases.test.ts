import { describe, expect, it } from 'vitest';
import { buildBasesSeries } from '@/lib/calculator/real-pension';
import { DEFAULT_CONSULTATION_LIFE_PATH } from '@/lib/calculator/life-path';
import { emptyExpediente } from '@/lib/expediente/types';
import type { ExpedienteDigital } from '@/lib/expediente/types';

function baseRow(periodo: string, base: number, id: string) {
  return {
    id,
    periodo: { value: periodo, sources: [] },
    base: { value: base, sources: [] },
    regimen: null,
    empresa: null,
    sources: [],
  };
}

describe('continúa trabajando — proyección de bases', () => {
  it('proyecta la última base documentada hasta la jubilación si no está en paro', () => {
    const exp: ExpedienteDigital = emptyExpediente('u1');
    exp.identificacion.fechaNacimiento = {
      value: '01/05/1974',
      sources: [],
    };
    exp.bases = [
      baseRow('01/2025', 2000, 'b1'),
      baseRow('02/2025', 2100, 'b2'),
      baseRow('03/2025', 2277.62, 'b3'),
    ] as ExpedienteDigital['bases'];

    const asOf = new Date(2025, 2, 15); // 15/03/2025
    const retirement = new Date(2039, 4, 1); // 01/05/2039
    const series = buildBasesSeries(
      exp,
      retirement,
      DEFAULT_CONSULTATION_LIFE_PATH,
      asOf
    );

    expect(series.documentedUsed).toBeGreaterThan(0);
    expect(series.projectedUsed).toBeGreaterThan(100);
    // Los meses futuros no deben ser 0
    const futureTail = series.bases.slice(-12);
    expect(futureTail.every((b) => b === 2277.62)).toBe(true);
    expect(series.note).toMatch(/sigue trabajando/i);
  });

  it('no inventa base futura si está en paro sin subsidio ni base SEPE', () => {
    const exp: ExpedienteDigital = emptyExpediente('u1');
    exp.identificacion.fechaNacimiento = {
      value: '01/05/1974',
      sources: [],
    };
    exp.bases = [baseRow('03/2025', 2277.62, 'b3')] as ExpedienteDigital['bases'];

    const asOf = new Date(2025, 2, 15);
    const retirement = new Date(2030, 4, 1);
    const series = buildBasesSeries(
      exp,
      retirement,
      {
        ...DEFAULT_CONSULTATION_LIFE_PATH,
        currentlyUnemployed: true,
      },
      asOf
    );

    const futureTail = series.bases.slice(-6);
    expect(futureTail.every((b) => b === 0)).toBe(true);
  });
});

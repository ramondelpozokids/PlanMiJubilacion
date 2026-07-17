/**
 * Tests del motor oficial de jubilación anticipada (tablas BOE).
 */
import { describe, expect, it } from 'vitest';
import {
  applyOfficialEarlyReduction,
  computeAnticipation,
  lookupOfficialReductionPercent,
  resolveCareerBracket,
  resolveEarlyRetirement,
} from '@/lib/rules/early-retirement';

describe('computeAnticipation', () => {
  it('cuenta 6 meses exactos entre 15/03/2029 y 15/09/2029', () => {
    const ordinary = new Date(2029, 8, 15); // 15 sep
    const chosen = new Date(2029, 2, 15); // 15 mar
    const a = computeAnticipation(ordinary, chosen);
    expect(a.years).toBe(0);
    expect(a.months).toBe(6);
    expect(a.days).toBe(0);
    expect(a.monthsEarly).toBe(6);
  });

  it('fracción de mes suma un mes legal', () => {
    const ordinary = new Date(2029, 8, 15);
    const chosen = new Date(2029, 2, 14); // 1 día más de adelanto
    const a = computeAnticipation(ordinary, chosen);
    expect(a.monthsEarly).toBe(7);
    expect(a.days).toBeGreaterThan(0);
  });

  it('marca demora si la fecha elegida es posterior', () => {
    const a = computeAnticipation(new Date(2029, 8, 15), new Date(2030, 0, 1));
    expect(a.isDeferred).toBe(true);
    expect(a.monthsEarly).toBe(0);
  });
});

describe('resolveCareerBracket', () => {
  it('asigna tramos por periodos completos', () => {
    expect(resolveCareerBracket(461).id).toBe('less_than_38y6m'); // 38y5m
    expect(resolveCareerBracket(462).id).toBe('from_38y6m_to_41y6m');
    expect(resolveCareerBracket(497).id).toBe('from_38y6m_to_41y6m');
    expect(resolveCareerBracket(498).id).toBe('from_41y6m_to_44y6m');
    expect(resolveCareerBracket(534).id).toBe('from_44y6m');
  });
});

describe('lookupOfficialReductionPercent — art. 208', () => {
  it('lee celda oficial 24 meses / <38y6m = 21%', () => {
    const r = lookupOfficialReductionPercent({
      kind: 'voluntary',
      year: 2026,
      monthsEarly: 24,
      bracketId: 'less_than_38y6m',
    });
    expect(r.reductionPercent).toBe(21);
  });

  it('lee celda oficial 6 meses / ≥44y6m = 3,45%', () => {
    const r = lookupOfficialReductionPercent({
      kind: 'voluntary',
      year: 2033,
      monthsEarly: 6,
      bracketId: 'from_44y6m',
    });
    expect(r.reductionPercent).toBe(3.45);
  });

  it('lee involuntaria 48 meses / <38y6m = 30%', () => {
    const r = lookupOfficialReductionPercent({
      kind: 'involuntary',
      year: 2026,
      monthsEarly: 48,
      bracketId: 'less_than_38y6m',
    });
    expect(r.reductionPercent).toBe(30);
  });

  it('DT34 2026 · 24 meses / <38y6m = 9,10%', () => {
    const r = lookupOfficialReductionPercent({
      kind: 'voluntary_over_max',
      year: 2026,
      monthsEarly: 24,
      bracketId: 'less_than_38y6m',
    });
    expect(r.reductionPercent).toBe(9.1);
  });
});

describe('resolveEarlyRetirement + apply', () => {
  const birth = new Date(1963, 2, 15);
  const ordinary = new Date(2029, 8, 15);
  const chosen = new Date(2029, 2, 15); // 6 meses antes

  it('voluntaria 6 meses · tramo corto → 4%', () => {
    const res = resolveEarlyRetirement({
      ordinaryDate: ordinary,
      chosenDate: chosen,
      birthDate: birth,
      completeContributionMonthsAtChosen: 420, // 35 años
    });
    expect(res.modality).toBe('voluntary');
    expect(res.anticipation.monthsEarly).toBe(6);
    expect(res.coefficient?.reductionPercent).toBe(4);
    expect(res.coefficient?.legalBasis).toMatch(/208/);
  });

  it('aplica coeficiente sin inventar fórmula', () => {
    const applied = applyOfficialEarlyReduction(2000, {
      ordinaryDate: ordinary,
      chosenDate: chosen,
      birthDate: birth,
      completeContributionMonthsAtChosen: 420,
    });
    // 2000 * (1 - 0.04) = 1920
    expect(applied.reductionPercent).toBe(4);
    expect(applied.monthly).toBe(1920);
  });

  it('DT34 sobre máxima usa tope como base', () => {
    const applied = applyOfficialEarlyReduction(
      4000,
      {
        ordinaryDate: ordinary,
        chosenDate: chosen,
        birthDate: birth,
        completeContributionMonthsAtChosen: 420,
        theoreticalMonthlyExceedsMax: true,
        rulesYear: 2026,
      },
      3267.6
    );
    expect(applied.appliedOverMaxPension).toBe(true);
    expect(applied.reductionPercent).toBe(1.9); // DT34 2026 · 6m · <38y6m
    expect(applied.monthly).toBe(Math.round(3267.6 * (1 - 0.019) * 100) / 100);
  });
});

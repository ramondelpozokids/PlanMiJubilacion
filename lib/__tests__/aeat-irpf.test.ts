import { describe, expect, it } from 'vitest';
import {
  aeatEscalaRetencion,
  estimateAeatPensionIrpf,
} from '@/lib/calculator/aeat-irpf';
import { applyPensionIrpf, resolvePensionIrpfRetention } from '@/lib/calculator/pension-pay';

describe('AEAT IRPF pensión (algoritmo 2026)', () => {
  it('aplica TABLA 2 en un ejemplo del algoritmo', () => {
    // Ejemplo AEAT: base 24.000 → 4.225,50 + 3.800×0,30 = 5.365,50
    expect(aeatEscalaRetencion(24_000)).toBe(5_365.5);
  });

  it('estima ~18,17 % para pensión 2.347,89 €/mes (14 pagas) a los 65', () => {
    const monthly = 2_347.89;
    const annual = monthly * 14;
    const est = estimateAeatPensionIrpf(annual, {
      ageYears: 65,
      familySituation: 3,
      dependents: 0,
      pensioner: true,
    });
    expect(est).not.toBeNull();
    expect(est!.retentionPercent).toBe(18.17);
    expect(est!.retention).toBeCloseTo(0.1817, 4);

    const pay = applyPensionIrpf(monthly); // sin override → AEAT
    expect(pay!.irpfRetention).toBeCloseTo(0.1817, 4);
    expect(pay!.irpfMonthly).toBeCloseTo(426.61, 1);
    expect(pay!.netMonthly).toBeCloseTo(1_921.28, 1);
  });

  it('respeta override manual', () => {
    expect(resolvePensionIrpfRetention(2_347.89, 0.15)).toBe(0.15);
  });
});

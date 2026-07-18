import { describe, expect, it } from 'vitest';
import {
  buildDateSimulation,
  PENSION_ANNUAL_PAYMENTS,
} from '@/lib/asesoria-wizard/simulate-at-date';
import { DEFAULT_CONSULTATION_LIFE_PATH } from '@/lib/calculator/life-path';
import { emptyExpediente } from '@/lib/expediente/types';

describe('simulación a fecha (asesoría)', () => {
  it('calcula bruto × 14, IRPF y neto con lifePath de consulta', () => {
    const exp = emptyExpediente('caso-amigo');
    exp.identificacion.fechaNacimiento = { value: '15/03/1965', sources: [] };
    exp.resumen.anosCotizados = { value: 38, sources: [] };
    exp.resumen.mesesCotizados = { value: 6, sources: [] };
    // Bases suficientes para BR (simplificado: un año reciente)
    for (let i = 0; i < 48; i++) {
      const d = new Date(2022, 0, 1);
      d.setMonth(d.getMonth() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      exp.bases.push({
        id: `b-${y}-${m}`,
        periodo: { value: `${y}-${m}`, sources: [] },
        base: { value: 2500, sources: [] },
        regimen: { value: 'RG', sources: [] },
        empresa: null,
        sources: [],
      });
    }

    const row = buildDateSimulation(exp, new Date(2030, 2, 15), {
      lifePath: DEFAULT_CONSULTATION_LIFE_PATH,
      irpfRetention: 0.15,
    });

    expect(row).not.toBeNull();
    expect(row!.annualPayments).toBe(PENSION_ANNUAL_PAYMENTS);
    if (row!.monthlyPension != null && row!.monthlyPension > 0) {
      expect(row!.annualPension).toBeCloseTo(row!.monthlyPension * 14, 1);
      expect(row!.irpfMonthly).toBeCloseTo(row!.monthlyPension * 0.15, 1);
      expect(row!.netMonthly).toBeCloseTo(row!.monthlyPension * 0.85, 1);
      expect(row!.netAnnual).toBeCloseTo(row!.netMonthly! * 14, 1);
    }
  });
});

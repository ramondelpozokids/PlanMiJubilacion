import { describe, expect, it } from 'vitest';
import { normalizeDocumentType, detectDocumentTypeFromText } from '@/lib/expediente/document-types';
import { normalizeDni, normalizeAmount, normalizeDate } from '@/lib/expediente/normalize';
import { calculatePension } from '@/lib/calculator/pension';
import {
  qualifiesFor65,
  ordinaryRetirementAgeYears,
  resolveOrdinaryRetirement,
} from '@/lib/rules/ss-rules';
import { emptyExpediente } from '@/lib/expediente/types';
import { derivePendingQuestions } from '@/lib/expediente/pending-questions';
import { crossValidateExpediente } from '@/lib/expediente/cross-validate';
import { buildExpedienteReport } from '@/lib/reports/expediente-report';
import { buildRetirementOutlook } from '@/lib/calculator/retirement-outlook';

describe('document-types', () => {
  it('normaliza tipos legacy', () => {
    expect(normalizeDocumentType('bases')).toBe('bases_cotizacion');
    expect(normalizeDocumentType('resolucion')).toBe('resolucion_inss');
    expect(normalizeDocumentType('vida_laboral')).toBe('vida_laboral');
  });

  it('detecta tipo por texto', () => {
    expect(detectDocumentTypeFromText('Informe de Vida Laboral', 'x.pdf')).toBe('vida_laboral');
    expect(detectDocumentTypeFromText('Bases de cotización', '')).toBe('bases_cotizacion');
    expect(detectDocumentTypeFromText('Recibo de nómina mayo', '')).toBe('nomina');
  });
});

describe('normalize helpers', () => {
  it('limpia DNI', () => {
    expect(normalizeDni('12.345.678-A')).toBe('12345678A');
  });

  it('parsea importes', () => {
    expect(normalizeAmount('1.234,56')).toBe(1234.56);
    expect(normalizeAmount(2000)).toBe(2000);
  });

  it('normaliza fechas', () => {
    expect(normalizeDate('01-02-1990')).toBe('01/02/1990');
  });
});

describe('ss-rules + pension', () => {
  it('edad ordinaria según cotización HOY (legacy)', () => {
    expect(qualifiesFor65(38 * 12 + 3)).toBe(true);
    expect(ordinaryRetirementAgeYears(20 * 12)).toBeGreaterThan(65);
  });

  it('Ramón 1967 + 34y5m → ordinaria a los 65 proyectando cotización', () => {
    const birth = new Date(1967, 7, 2); // 02/08/1967
    const months = 34 * 12 + 5;
    const r = resolveOrdinaryRetirement({
      birth,
      monthsContributedNow: months,
      asOf: new Date(2026, 6, 15),
      assumeContinueContributing: true,
    });
    expect(r.at65).toBe(true);
    expect(r.ageYears).toBe(65);
    expect(r.date.getFullYear()).toBe(2032);
  });

  it('sin proyectar cotización no llega a 65', () => {
    const r = resolveOrdinaryRetirement({
      birth: new Date(1967, 7, 2),
      monthsContributedNow: 34 * 12 + 5,
      asOf: new Date(2026, 6, 15),
      assumeContinueContributing: false,
    });
    expect(r.at65).toBe(false);
    expect(r.ageYears).toBe(67);
  });

  it('calcula pensión orientativa', () => {
    const result = calculatePension({
      birthDate: '1960-01-01',
      retirementDate: '2026-01-01',
      basesLast300Months: Array(300).fill(2000),
      totalMonthsContributed: 40 * 12,
    });
    expect(result.monthlyPension).toBeGreaterThan(0);
    expect(result.percentageByYears).toBe(100);
  });
});

describe('retirement outlook', () => {
  it('fecha ordinaria y % reductores anticipados', () => {
    const exp = emptyExpediente('u1');
    exp.identificacion.fechaNacimiento = { value: '02/08/1967', sources: [] };
    exp.resumen.anosCotizados = { value: 34, sources: [] };
    exp.resumen.mesesCotizados = { value: 5, sources: [] };
    exp.bases = [
      {
        id: 'b1',
        periodo: { value: '01/2024', sources: [] },
        base: { value: 2500, sources: [] },
        regimen: null,
        empresa: null,
        sources: [],
      },
    ];
    const outlook = buildRetirementOutlook(exp, new Date('2026-07-15'));
    expect(outlook).not.toBeNull();
    expect(outlook!.ordinary.ageYears).toBe(65);
    expect(outlook!.ordinary.at65IfCareer).toBe(true);
    expect(outlook!.ordinary.date.getFullYear()).toBe(2032);
    // Sin simulación ni 300 bases → no inventamos importe
    expect(outlook!.pension.ordinaryResult).toBeNull();
    expect(outlook!.pension.quality).toBe('none');
  });
});

describe('pending questions', () => {
  it('no pregunta lo que ya está en expediente', () => {
    const exp = emptyExpediente('user-1');
    exp.identificacion.fechaNacimiento = {
      value: '01/01/1960',
      sources: [],
    };
    exp.identificacion.edad = { value: 66, sources: [] };
    exp.resumen.anosCotizados = { value: 35, sources: [] };
    exp.periodos = [
      {
        id: '1',
        empresa: null,
        ccc: null,
        fechaAlta: null,
        fechaBaja: null,
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
    const qs = derivePendingQuestions(exp);
    expect(qs.find((q) => q.id === 'fechaNacimiento')).toBeUndefined();
    expect(qs.find((q) => q.id === 'vida_laboral')).toBeUndefined();
  });

  it('pide vida laboral si no hay periodos ni años', () => {
    const exp = emptyExpediente('user-1');
    const qs = derivePendingQuestions(exp);
    expect(qs.some((q) => q.id === 'vida_laboral')).toBe(true);
  });
});

describe('cross-validate', () => {
  it('detecta bases distintas en mismo periodo', () => {
    const exp = emptyExpediente('u');
    exp.bases = [
      {
        id: '1',
        periodo: { value: '01/2024', sources: [] },
        base: { value: 1000, sources: [] },
        regimen: null,
        empresa: null,
        sources: [],
      },
      {
        id: '2',
        periodo: { value: '01/2024', sources: [] },
        base: { value: 2000, sources: [] },
        regimen: null,
        empresa: null,
        sources: [],
      },
    ];
    const disc = crossValidateExpediente(exp);
    expect(disc.some((d) => d.field.includes('base'))).toBe(true);
  });
});

describe('corte hasta hoy (bases)', () => {
  it('acepta meses ≤ actual y rechaza futuros', async () => {
    const { isContributionMonthOnOrBeforeToday } = await import('@/lib/expediente/sanitize');
    const asOf = new Date(2026, 6, 15); // 15 jul 2026
    expect(isContributionMonthOnOrBeforeToday('06/2026', asOf)).toBe(true);
    expect(isContributionMonthOnOrBeforeToday('07/2026', asOf)).toBe(true);
    expect(isContributionMonthOnOrBeforeToday('08/2026', asOf)).toBe(false);
    expect(isContributionMonthOnOrBeforeToday('hasta el presente', asOf)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  extractVidaLaboralDayTotals,
  parseVidaLaboralFromText,
} from '@/lib/ai/parse-vida-laboral';
import {
  contributionMonthsFromExpediente,
  resolveExpedienteAsOf,
} from '@/lib/expediente/as-of';
import { emptyExpediente } from '@/lib/expediente/types';
import { buildRetirementOutlook } from '@/lib/calculator/retirement-outlook';
import { isContributionMonthOnOrBeforeToday } from '@/lib/expediente/sanitize';

const SAMPLE_DATED = `
INFORME DE VIDA LABORAL
De los antecedentes obrantes en la Tesorería General de la Seguridad Social al día 19 de julio de 2026 , resulta que D/Dª
RAMON DEL POZO ROTT , nacido/a el 2 de agosto de 1967 , con
Número de la Seguridad Social 280406289544 , D.N.I. 007534307J , domicilio en
CALLE TEST 1 , 28038 MADRID MADRID
ha figurado en situación de alta en el Sistema de la Seguridad Social durante un total de
34 Años
12.549 días 4 meses
11 días
Durante los días indicados en el párrafo anterior Vd. ha estado de forma simultánea en dos o más empresas del mismo Régimen del sistema de la
Seguridad Social -pluriempleo-, o en dos, o más Regímenes distintos del citado sistema -pluriactividad-, durante un total de 322 días, por lo que
el total de días efectivamente computables para las prestaciones económicas del Sistema de la Seguridad Social es de
33 Años
12.227 días 5 meses
23 días

INFORME DE VIDA LABORAL - SITUACIONES
GENERAL 28002577348 EMPRESA TEST 01.01.2020 01.01.2020 31.12.2025 100 --- 08 2.191
`;

describe('fecha informe y días exactos', () => {
  it('extrae fechaInforme y días restantes del bloque computable', () => {
    const totals = extractVidaLaboralDayTotals(SAMPLE_DATED);
    expect(totals.diasComputables).toBe(12227);
    expect(totals.anosComputables).toBe(33);
    expect(totals.mesesComputables).toBe(5);
    expect(totals.diasRestantesComputables).toBe(23);
    expect(totals.diasAltaTotal).toBe(12549);
    expect(totals.diasPluriempleo).toBe(322);

    const parsed = parseVidaLaboralFromText(SAMPLE_DATED);
    expect(parsed.resumen.fechaInforme).toBe('19/07/2026');
    expect(parsed.resumen.diasRestantes).toBe(23);
    expect(parsed.resumen.anosCotizados).toBe(33);
    expect(parsed.resumen.mesesCotizados).toBe(5);
    expect(parsed.resumen.totalDiasCotizacion).toBe(12227);
  });

  it('resolveExpedienteAsOf usa la fecha del informe', () => {
    const exp = emptyExpediente('u1');
    exp.resumen.fechaInforme = { value: '19/07/2026', sources: [] };
    const asOf = resolveExpedienteAsOf(exp);
    expect(asOf.getFullYear()).toBe(2026);
    expect(asOf.getMonth()).toBe(6);
    expect(asOf.getDate()).toBe(19);
  });

  it('recorta bases posteriores al mes del informe', () => {
    const asOf = new Date(2026, 6, 19); // 19/07/2026
    expect(isContributionMonthOnOrBeforeToday('07/2026', asOf)).toBe(true);
    expect(isContributionMonthOnOrBeforeToday('08/2026', asOf)).toBe(false);
  });

  it('contributionMonthsFromExpediente usa días computables', () => {
    const exp = emptyExpediente('u1');
    exp.resumen.totalDiasCotizacion = { value: 12227, sources: [] };
    exp.resumen.anosCotizados = { value: 33, sources: [] };
    exp.resumen.mesesCotizados = { value: 5, sources: [] };
    expect(contributionMonthsFromExpediente(exp)).toBe(Math.round(12227 / 30.4375));
  });

  it('jubilación ordinaria exacta dd/MM/yyyy (Ramón 02/08/1967 → 02/08/2032)', () => {
    const exp = emptyExpediente('u1');
    exp.identificacion.fechaNacimiento = { value: '02/08/1967', sources: [] };
    exp.resumen.anosCotizados = { value: 33, sources: [] };
    exp.resumen.mesesCotizados = { value: 7, sources: [] };
    exp.resumen.diasRestantes = { value: 1, sources: [] };
    exp.resumen.totalDiasCotizacion = { value: 12266, sources: [] };
    exp.resumen.fechaInforme = { value: '19/07/2026', sources: [] };
    exp.bases = [
      {
        id: 'b1',
        periodo: { value: '01/2026', sources: [] },
        base: { value: 2000, sources: [] },
        regimen: null,
        empresa: null,
        sources: [],
      },
    ];

    const asOf = resolveExpedienteAsOf(exp);
    const outlook = buildRetirementOutlook(exp, asOf);
    expect(outlook).not.toBeNull();
    expect(outlook!.carrera).toEqual({ years: 33, months: 7, days: 1 });
    expect(outlook!.ordinary.missingForAge65).toEqual({
      years: 4,
      months: 10,
      days: 29,
    });
    expect(outlook!.ordinary.careerCompleteDateLabel).toBe('17/06/2031');
    expect(outlook!.ordinary.dateLabel).toBe('02/08/2032');
    expect(outlook!.ordinary.at65IfCareer).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { parseBasesFromText } from '@/lib/ai/parse-bases-cotizacion';
import {
  parseAllBasesFromText,
  parseInformeIntegralBases,
} from '@/lib/ai/parse-informe-bases-integral';

describe('parseBasesFromText', () => {
  it('extrae meses MM/YYYY e importes', () => {
    const text = `
      Informe de bases de cotización
      01/2023  1.850,22
      02/2023  1.900,00
      03/2024  2.100,55
    `;
    const rows = parseBasesFromText(text);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.find((r) => r.periodo === '01/2023')?.base).toBe(1850.22);
  });
});

describe('parseInformeIntegralBases', () => {
  const SAMPLE = `
INFORME INTEGRAL DE BASES DE COTIZACIÓN
Régimen: GENERAL Empresa/Razón Social: REAL MADRID CLUB FUTBOL CCC: 28002577348
Enero Febrero Marzo Abril Mayo Junio Julio Agosto Septiembre Octubre Noviembre Diciembre
2026 2.748,49 2.277,53 2.277,62 2.277,62 2.361,62 Pendiente
de actualizar ---
2025 --- --- --- --- --- --- --- --- 1.131,74 2.300,14 2.273,91 2.273,91
Régimen: GENERAL Empresa/Razón Social: ILUNION OUTSOURCING S.A.U CCC: 28111435412
Enero Febrero Marzo Abril Mayo Junio Julio Agosto Septiembre Octubre Noviembre Diciembre
2025 1.766,71 1.689,33 2.437,33 2.409,33 2.045,33 1.381,33 1.761,33 1.429,33 790,67 --- --- ---
2000 Sin base
registrada
Sin base
registrada
Sin base
registrada
Sin base
registrada
Sin base
registrada
Sin base
registrada
Sin base
registrada
Sin base
registrada
Sin base
registrada 919,55 919,55 919,55
`;

  it('lee rejilla año × 12 meses y suma pluriempleo', () => {
    const rows = parseInformeIntegralBases(SAMPLE);
    expect(rows.find((r) => r.periodo === '01/2026')?.base).toBe(2748.49);
    expect(rows.find((r) => r.periodo === '09/2025')?.base).toBeCloseTo(1131.74 + 790.67, 1);
    expect(rows.find((r) => r.periodo === '10/2000')?.base).toBe(919.55);
    expect(rows.some((r) => r.periodo === '12/2026')).toBe(false);
  });

  it('parseAllBasesFromText no mezcla legado basura si integral es completo', () => {
    const withRange = `${SAMPLE}\nPeriodo informe\n01/1990 - 12/2026\n`;
    const rows = parseAllBasesFromText(withRange);
    expect(rows.length).toBeGreaterThanOrEqual(12);
    expect(rows.some((r) => r.periodo === '12/2026')).toBe(false);
  });
});

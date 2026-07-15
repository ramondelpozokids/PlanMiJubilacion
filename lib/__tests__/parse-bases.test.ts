import { describe, expect, it } from 'vitest';
import { parseBasesFromText } from '@/lib/ai/parse-bases-cotizacion';

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

import { describe, expect, it } from 'vitest';
import { emptyExpediente } from '@/lib/expediente/types';
import { generateSystemScenarios, simulateScenario } from '@/lib/calculator/simulate';

function sampleExpediente() {
  const exp = emptyExpediente('u1');
  exp.identificacion.fechaNacimiento = { value: '02/08/1967', sources: [] };
  exp.resumen.anosCotizados = { value: 34, sources: [] };
  exp.resumen.mesesCotizados = { value: 5, sources: [] };
  exp.resumen.baseMensualActual = { value: 2500, sources: [] };
  for (let i = 0; i < 24; i++) {
    const d = new Date(2024, 0 + i, 1);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    exp.bases.push({
      id: `b${i}`,
      periodo: { value: `${m}/${d.getFullYear()}`, sources: [] },
      base: { value: 2400 + i * 10, sources: [] },
      regimen: null,
      empresa: null,
      sources: [],
    });
  }
  return exp;
}

describe('simulateScenario', () => {
  it('calcula con bases + path subsidio; ignora simulación SS como verdad', () => {
    const exp = sampleExpediente();
    exp.resoluciones = [
      {
        id: 'r1',
        organismo: { value: 'INSS', sources: [] },
        numeroExpediente: null,
        fecha: { value: '02/08/2032', sources: [] },
        tipo: { value: 'simulacion_jubilacion', sources: [] },
        resumen: { value: 'Simulación oficial SS', sources: [] },
        importe: { value: 3475.36, sources: [] },
        sources: [],
      },
    ];
    const s = simulateScenario(exp, {
      name: 'A los 63',
      retirementDate: '2030-08-02',
    });
    expect(s).not.toBeNull();
    expect(s!.result.monthlyPension).toBeGreaterThan(0);
    expect(s!.result.monthlyPension).toBeLessThan(3475);
    expect(s!.quality).toBe('partial');
    expect(s!.notes).toMatch(/subsidio|informe|bases/i);
  });

  it('genera pack del sistema', () => {
    const exp = sampleExpediente();
    const pack = generateSystemScenarios(exp);
    expect(pack.length).toBeGreaterThanOrEqual(1);
  });
});

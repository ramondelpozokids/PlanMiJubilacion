import { describe, expect, it } from 'vitest';
import fs from 'fs';
import { parseInformeIntegralBases } from '@/lib/ai/parse-informe-bases-integral';
import { parseSimulacionFromText } from '@/lib/ai/parse-simulacion-jubilacion';
import { getRealPensionSnapshot } from '@/lib/calculator/real-pension';
import { emptyExpediente } from '@/lib/expediente/types';

const BASES_TXT =
  'C:/Users/X/Desktop/PlanMiJubilacion/.tmp-Informe_Bases_Cotizaci_n_Online_pdf.txt';
const SIM_TXT = 'C:/Users/X/Desktop/PlanMiJubilacion/.tmp-simulacion_de_jubilacion_pdf.txt';

describe('parseInformeIntegralBases (PDF real)', () => {
  it('extrae cientos de meses del layout año+12 columnas', () => {
    if (!fs.existsSync(BASES_TXT)) return;
    const text = fs.readFileSync(BASES_TXT, 'utf8');
    const rows = parseInformeIntegralBases(text);
    expect(rows.length).toBeGreaterThan(200);
    // Embajada 2023 debería estar
    expect(rows.some((r) => r.periodo === '01/2023' && r.base > 3000)).toBe(true);
  });
});

describe('parseSimulacionFromText (PDF real)', () => {
  it('lee 3475,36 €/mes y 65 años el 02/08/2032', () => {
    if (!fs.existsSync(SIM_TXT)) return;
    const text = fs.readFileSync(SIM_TXT, 'utf8');
    const s = parseSimulacionFromText(text);
    expect(s.pensionMensual).toBe(3475.36);
    expect(s.baseReguladora).toBe(3475.36);
    expect(s.edadJubilacion).toBe(65);
    expect(s.fechaJubilacion).toBe('02/08/2032');
    expect(s.porcentaje).toBe(100);
  });
});

describe('getRealPensionSnapshot', () => {
  it('la simulación SS es solo referencia; sin bases → none', () => {
    const exp = emptyExpediente('u1');
    exp.identificacion.fechaNacimiento = { value: '02/08/1967', sources: [] };
    exp.resumen.anosCotizados = { value: 34, sources: [] };
    exp.resumen.mesesCotizados = { value: 5, sources: [] };
    exp.resoluciones = [
      {
        id: 'r1',
        organismo: { value: 'INSS', sources: [] },
        numeroExpediente: null,
        fecha: { value: '02/08/2032', sources: [] },
        tipo: { value: 'simulacion_jubilacion', sources: [] },
        resumen: {
          value: 'Simulación oficial SS · edad 65 · pensión 3475.36 €/mes',
          sources: [],
        },
        importe: { value: 3475.36, sources: [] },
        sources: [
          {
            documentId: 'd1',
            documentName: 'simulacion.pdf',
            documentType: 'simulacion_jubilacion',
            extractedAt: new Date().toISOString(),
          },
        ],
      },
    ];
    const snap = getRealPensionSnapshot(exp);
    expect(snap.quality).toBe('none');
    expect(snap.ordinaryMonthly).toBeNull();
    expect(snap.officialSimReference?.pensionMensual).toBe(3475.36);
  });

  it('con bases documentadas usa scenario subsidio +52, no la sim SS', () => {
    const exp = emptyExpediente('u1');
    exp.identificacion.fechaNacimiento = { value: '02/08/1967', sources: [] };
    exp.resumen.anosCotizados = { value: 34, sources: [] };
    exp.resumen.mesesCotizados = { value: 5, sources: [] };
    exp.resoluciones = [
      {
        id: 'r1',
        organismo: null,
        numeroExpediente: null,
        fecha: null,
        tipo: { value: 'simulacion_jubilacion', sources: [] },
        resumen: null,
        importe: { value: 3475.36, sources: [] },
        sources: [],
      },
    ];
    for (let i = 0; i < 24; i++) {
      const d = new Date(2024, 0 + i, 1);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      exp.bases.push({
        id: `b${i}`,
        periodo: { value: `${m}/${d.getFullYear()}`, sources: [] },
        base: { value: 3200, sources: [] },
        regimen: null,
        empresa: null,
        sources: [],
      });
    }
    const snap = getRealPensionSnapshot(exp, {
      retirementDate: new Date(2032, 7, 2),
      asOf: new Date(2026, 6, 15),
    });
    expect(snap.quality).toBe('bases_plus_path');
    expect(snap.ordinaryMonthly).not.toBeNull();
    expect(snap.ordinaryMonthly!).toBeLessThan(3475);
    expect(snap.officialSimReference?.pensionMensual).toBe(3475.36);
  });
});

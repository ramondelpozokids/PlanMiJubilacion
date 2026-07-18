import { describe, expect, it } from 'vitest';
import {
  parseVidaLaboralPeriodLine,
  parseVidaLaboralPeriodosFromText,
  parseVidaLaboralFromText,
} from '@/lib/ai/parse-vida-laboral';
import { enrichVidaLaboralFromRawText } from '@/lib/ocr/enrich-vida-laboral';
import type { FullDocumentExtraction } from '@/lib/ai/vida-laboral-types';
import fs from 'fs';

/** Layout real Import@ss (fechas con puntos, régimen GENERAL/AUTONOMO). */
const SAMPLE_VIDA = `
INFORME DE VIDA LABORAL
De los antecedentes obrantes en la Tesorería General de la Seguridad Social al día 1 de septiembre de 2025 , resulta que D/Dª
RAMON DEL POZO ROTT , nacido/a el 2 de agosto de 1967 , con
Número de la Seguridad Social 280406289544 , D.N.I. 007534307J , domicilio en
CALLE SIERRA DE CUERDA LARGA Nº 4 PISO 1 PTA. B , 28038 MADRID MADRID
ha figurado en situación de alta en el Sistema de la Seguridad Social durante un total de
33 Años
12.332 días 9 meses
6 días
el total de días efectivamente computables para las prestaciones económicas del Sistema de la Seguridad Social es de
32 Años
12.010 días 10 meses
18 días

INFORME DE VIDA LABORAL - SITUACIONES
DATOS IDENTIFICATIVOS
NOMBRE Y APELLIDOS Nº SEGURIDAD SOCIAL DOCUMENTO IDENTIFICATIVO
RAMON DEL POZO ROTT 280406289544 D.N.I. 007534307J
SITUACIÓN/ES
RÉGIMEN EMPRESA
SITUACIÓN ASIMILADA A LA DE ALTA FECHA ALTA
GENERAL 28271425491 KOBE RODRIGUEZ DANIEL 03.07.2025 03.07.2025 18.07.2025 100 --- 05 16
AUTONOMO ----------- MADRID 23.04.2023 23.04.2023 30.06.2025 --- --- -- 800
GENERAL 28008801213 EMBAJADA REPUBLICA FEDERAL
ALEMANA
01.09.1999 01.09.1999 07.02.2024 100 --- 08 8.926
GENERAL 28110079129 SEPROTEM, E.T.T., S.A. 01.12.1999 01.12.1999 01.12.1999 015 --- 10 1
GENERAL ----------- PRESTACION DESEMPLEO. EXTINCION 05.09.1997 05.09.1997 04.05.1998 --- --- 08 242

Notas aclaratorias
Los informes de vida laboral contienen información respecto de las situaciones.
`;

describe('parseVidaLaboralPeriodLine (layout oficial)', () => {
  it('lee GENERAL + CCC + fechas con puntos', () => {
    const p = parseVidaLaboralPeriodLine(
      'GENERAL 28271425491 KOBE RODRIGUEZ DANIEL 03.07.2025 03.07.2025 18.07.2025 100 --- 05 16'
    );
    expect(p).not.toBeNull();
    expect(p!.fechaAlta).toBe('03/07/2025');
    expect(p!.fechaBaja).toBe('18/07/2025');
    expect(p!.ccc).toBe('28271425491');
    expect(p!.empresa).toMatch(/KOBE/i);
    expect(p!.regimen).toBe('general');
    expect(p!.diasCotizados).toBe(16);
    expect(p!.grupoCotizacion).toBe('05');
    expect(p!.tipo).toBe('contrato');
  });

  it('lee AUTONOMO y días con separador de miles', () => {
    const p = parseVidaLaboralPeriodLine(
      'AUTONOMO ----------- MADRID 23.04.2023 23.04.2023 30.06.2025 --- --- -- 800'
    );
    expect(p!.tipo).toBe('autonomo');
    expect(p!.regimen).toBe('autonomos');
    expect(p!.diasCotizados).toBe(800);
    expect(p!.ccc).toBeNull();
  });

  it('lee días 8.926 como 8926', () => {
    const p = parseVidaLaboralPeriodLine(
      'GENERAL 28008801213 EMBAJADA REPUBLICA FEDERAL ALEMANA 01.09.1999 01.09.1999 07.02.2024 100 --- 08 8.926'
    );
    expect(p!.diasCotizados).toBe(8926);
    expect(p!.empresa).toMatch(/EMBAJADA/i);
  });
});

describe('parseVidaLaboralPeriodosFromText', () => {
  it('extrae contratos, autónomos y desempleo; une empresa multilínea', () => {
    const r = parseVidaLaboralPeriodosFromText(SAMPLE_VIDA);
    expect(r.periodosContrato.length).toBeGreaterThanOrEqual(2);
    expect(r.periodosAutonomo.length).toBeGreaterThanOrEqual(1);
    expect(r.prestacionesDesempleo.length).toBeGreaterThanOrEqual(1);
    expect(r.periodosContrato.some((p) => /EMBAJADA/i.test(p.empresa ?? ''))).toBe(true);
    expect(r.periodosContrato.some((p) => /SEPROTEM/i.test(p.empresa ?? ''))).toBe(true);
  });
});

describe('parseVidaLaboralFromText', () => {
  it('saca identidad narrativa y días computables', () => {
    const r = parseVidaLaboralFromText(SAMPLE_VIDA);
    expect(r.identificacion.nombre).toMatch(/RAMON DEL POZO/i);
    expect(r.identificacion.dni).toBe('07534307J');
    expect(r.identificacion.numeroAfiliacion).toBe('280406289544');
    expect(r.identificacion.fechaNacimiento).toBe('02/08/1967');
    expect(r.resumen.totalDiasCotizacion).toBe(12010);
    expect(r.periodosContrato.length).toBeGreaterThanOrEqual(2);
  });
});

describe('enrichVidaLaboralFromRawText', () => {
  it('rellena periodos cuando el OCR dejó el informe vacío', () => {
    const empty: FullDocumentExtraction = {
      informeCompleto: {
        documentType: 'vida_laboral',
        identificacion: {
          nombre: null,
          dni: null,
          nie: null,
          numeroAfiliacion: null,
          fechaNacimiento: null,
          edad: null,
          direccion: null,
          localidad: null,
          provincia: null,
          codigoPostal: null,
        },
        resumen: {
          totalDiasCotizacion: null,
          anosCotizados: null,
          mesesCotizados: null,
          diasRestantes: null,
          regimenPrincipal: null,
          situacionActual: null,
          fechaInforme: null,
        },
        periodosContrato: [],
        periodosAutonomo: [],
        prestacionesDesempleo: [],
        situacionesAsimiladas: [],
        lagunas: [],
        basesCotizacion: [],
        otrosDatos: {},
        paginasProcesadas: 1,
        totalPeriodosExtraidos: 0,
      },
      rawText: SAMPLE_VIDA,
      confidence: 0.3,
      nombre: null,
      fechaNacimiento: null,
      edad: null,
      empresa: null,
      regimen: null,
      grupoCotizacion: null,
      salarioBruto: null,
      baseMensual: null,
      basesUltimos24: [],
      anosCotizados: null,
      mesesCotizados: null,
      lagunas: [],
      actualmenteTrabajando: null,
      esAutonomo: null,
    };

    const enriched = enrichVidaLaboralFromRawText(empty, 'vida_laboral');
    expect(enriched.informeCompleto.periodosContrato.length).toBeGreaterThanOrEqual(2);
    expect(enriched.informeCompleto.identificacion.nombre).toMatch(/RAMON/i);
    expect(enriched.informeCompleto.resumen.totalDiasCotizacion).toBe(12010);
  });
});

describe('PDF real (si existe)', () => {
  const REAL =
    'C:/Users/X/Desktop/PlanMiJubilacion/.tmp-vida-laboral-pdf.txt';

  it('extrae docenas de periodos del informe del fundador', () => {
    if (!fs.existsSync(REAL)) return;
    const text = fs.readFileSync(REAL, 'utf8');
    const r = parseVidaLaboralFromText(text);
    expect(r.identificacion.nombre).toMatch(/RAMON DEL POZO/i);
    expect(r.periodosContrato.length).toBeGreaterThan(10);
    expect(r.periodosContrato.some((p) => /EMBAJADA/i.test(p.empresa ?? ''))).toBe(true);
    expect(r.resumen.totalDiasCotizacion).toBeGreaterThan(10000);
  });
});

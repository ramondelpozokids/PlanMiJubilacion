/**
 * Normalización — transforma extracciones crudas al modelo canónico.
 */
import type { FullDocumentExtraction } from '@/lib/ai/vida-laboral-types';
import type { DocumentTypeKey } from './document-types';
import type {
  BaseCotizacionNormalizada,
  FieldProvenance,
  PeriodoLaboralNormalizado,
  PrestacionNormalizada,
  ResolucionNormalizada,
} from './types';
import { newId } from './types';
import {
  sanitizeCompanyName,
  isContributionMonthOnOrBeforeToday,
  filterPeriodToToday,
  parseDmy,
  endOfToday,
} from './sanitize';

export interface NormalizedDocumentPayload {
  documentType: DocumentTypeKey;
  identificacion: Partial<Record<string, string | number | null>>;
  resumen: Partial<Record<string, string | number | null>>;
  periodos: Omit<PeriodoLaboralNormalizado, 'id' | 'sources'>[];
  prestaciones: Omit<PrestacionNormalizada, 'id' | 'sources'>[];
  bases: Omit<BaseCotizacionNormalizada, 'id' | 'sources'>[];
  resoluciones: Omit<ResolucionNormalizada, 'id' | 'sources'>[];
  lagunas: Array<{ desde: string | null; hasta: string | null; dias: number | null }>;
  rawText: string;
  confidence: number;
}

function prov(
  documentId: string,
  documentName: string,
  documentType: DocumentTypeKey,
  confidence?: number
): FieldProvenance {
  return {
    documentId,
    documentName,
    documentType,
    extractedAt: new Date().toISOString(),
    confidence,
  };
}

function sv<T>(
  value: T | null | undefined,
  source: FieldProvenance
): { value: T; sources: FieldProvenance[] } | null {
  if (value == null || value === '') return null;
  return { value, sources: [source] };
}

export function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  const m2 = raw.match(/(\d{2})[\/\-](\d{4})/);
  if (m2) return `${m2[1]}/${m2[2]}`;
  return raw.trim();
}

export function normalizeAmount(raw: number | string | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  const n = parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

export function normalizeDni(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/[\s.-]/g, '').toUpperCase();
}

export function normalizeFromVidaLaboral(
  extraction: FullDocumentExtraction,
  documentId: string,
  documentName: string,
  documentType: DocumentTypeKey
): NormalizedDocumentPayload {
  const ic = extraction.informeCompleto;
  const source = prov(documentId, documentName, documentType, extraction.confidence);
  const id = ic.identificacion;
  const res = ic.resumen;

  const periodosRaw: NormalizedDocumentPayload['periodos'] = [
    ...ic.periodosContrato.map((p) => ({
      empresa: sv(sanitizeCompanyName(p.empresa), source),
      ccc: sv(p.ccc, source),
      fechaAlta: sv(normalizeDate(p.fechaAlta), source),
      fechaBaja: sv(normalizeDate(p.fechaBaja), source),
      tipoContrato: null,
      regimen: sv(p.regimen, source),
      grupoCotizacion: sv(p.grupoCotizacion, source),
      situacion: sv(p.situacion, source),
      diasCotizados: sv(p.diasCotizados, source),
      baseCotizacion: null,
      salario: null,
      categoria: 'contrato' as const,
    })),
    ...ic.periodosAutonomo.map((p) => ({
      empresa: sv(sanitizeCompanyName(p.empresa) ?? p.empresa, source),
      ccc: sv(p.ccc, source),
      fechaAlta: sv(normalizeDate(p.fechaAlta), source),
      fechaBaja: sv(normalizeDate(p.fechaBaja), source),
      tipoContrato: null,
      regimen: sv(p.regimen ?? 'autonomos', source),
      grupoCotizacion: sv(p.grupoCotizacion, source),
      situacion: sv(p.situacion, source),
      diasCotizados: sv(p.diasCotizados, source),
      baseCotizacion: null,
      salario: null,
      categoria: 'autonomo' as const,
    })),
    ...ic.situacionesAsimiladas.map((p) => ({
      empresa: sv(sanitizeCompanyName(p.empresa), source),
      ccc: sv(p.ccc, source),
      fechaAlta: sv(normalizeDate(p.fechaAlta), source),
      fechaBaja: sv(normalizeDate(p.fechaBaja), source),
      tipoContrato: null,
      regimen: sv(p.regimen, source),
      grupoCotizacion: sv(p.grupoCotizacion, source),
      situacion: sv(p.situacion, source),
      diasCotizados: sv(p.diasCotizados, source),
      baseCotizacion: null,
      salario: null,
      categoria: 'asimilada' as const,
    })),
  ];

  const periodos = periodosRaw
    .map((p) => filterPeriodToToday(p))
    .filter((p): p is NonNullable<typeof p> => p != null);

  const prestaciones: NormalizedDocumentPayload['prestaciones'] =
    ic.prestacionesDesempleo
      .map((p) => ({
        tipo: sv(p.tipo, source),
        organismo: sv('SEPE', source),
        numeroExpediente: null,
        fechaInicio: sv(normalizeDate(p.fechaInicio), source),
        fechaFin: sv(normalizeDate(p.fechaFin), source),
        dias: sv(p.dias, source),
        importe: null,
        situacion: sv(p.situacion, source),
        observaciones: sv(p.observaciones, source),
      }))
      .filter((p) => {
        const ini = parseDmy(p.fechaInicio?.value ?? null);
        // Descarta prestaciones que empiezan en el futuro
        if (ini && ini.getTime() > endOfToday().getTime()) return false;
        return true;
      });

  const bases: NormalizedDocumentPayload['bases'] = ic.basesCotizacion
    .map((b) => ({
      periodo: sv(normalizeDate(b.periodo), source),
      base: sv(normalizeAmount(b.base), source),
      regimen: sv(b.regimen, source),
      empresa: null,
    }))
    .filter((b) => isContributionMonthOnOrBeforeToday(b.periodo?.value ?? null));

  return {
    documentType,
    identificacion: {
      nombre: id.nombre,
      dni: id.dni,
      nie: id.nie,
      numeroAfiliacion: id.numeroAfiliacion,
      fechaNacimiento: id.fechaNacimiento,
      edad: id.edad,
      direccion: id.direccion,
      localidad: id.localidad,
      provincia: id.provincia,
      codigoPostal: id.codigoPostal,
    },
    resumen: {
      totalDiasCotizacion: res.totalDiasCotizacion,
      anosCotizados: res.anosCotizados,
      mesesCotizados: res.mesesCotizados,
      regimenPrincipal: res.regimenPrincipal,
      situacionActual: res.situacionActual,
      empresaActual: sanitizeCompanyName(extraction.empresa),
      baseMensualActual: extraction.baseMensual,
    },
    periodos,
    prestaciones,
    bases,
    resoluciones: [],
    lagunas: ic.lagunas
      .map((l) => ({
        desde: l.desde,
        hasta: l.hasta,
        dias: l.dias,
      }))
      .filter((l) => {
        const desde = parseDmy(l.desde);
        if (desde && desde.getTime() > endOfToday().getTime()) return false;
        return true;
      }),
    rawText: extraction.rawText,
    confidence: extraction.confidence,
  };
}

/** Normalizadores por tipo documental */
export function normalizeNomina(
  extraction: FullDocumentExtraction,
  documentId: string,
  documentName: string,
  documentType: DocumentTypeKey
): NormalizedDocumentPayload {
  const base = normalizeFromVidaLaboral(extraction, documentId, documentName, documentType);
  const otros = extraction.informeCompleto.otrosDatos;
  const salario = normalizeAmount(
    (otros.salarioBruto as number) ?? extraction.salarioBruto ?? extraction.baseMensual
  );
  const baseCot = normalizeAmount((otros.baseCotizacion as number) ?? extraction.baseMensual);

  if (salario != null && base.periodos.length === 0) {
    const source = prov(documentId, documentName, documentType, extraction.confidence);
    base.periodos.push({
      empresa: sv(extraction.empresa, source),
      ccc: null,
      fechaAlta: sv(normalizeDate(extraction.informeCompleto.resumen.fechaInforme), source),
      fechaBaja: null,
      tipoContrato: sv(String(otros.tipoContrato ?? ''), source),
      regimen: sv(extraction.regimen, source),
      grupoCotizacion: sv(extraction.grupoCotizacion, source),
      situacion: null,
      diasCotizados: null,
      baseCotizacion: sv(baseCot, source),
      salario: sv(salario, source),
      categoria: 'contrato',
    });
  }

  if (baseCot != null) {
    const source = prov(documentId, documentName, documentType, extraction.confidence);
    const periodo = extraction.informeCompleto.resumen.fechaInforme ?? 'reciente';
    base.bases.push({
      periodo: sv(normalizeDate(periodo), source),
      base: sv(baseCot, source),
      regimen: sv(extraction.regimen, source),
      empresa: sv(extraction.empresa, source),
    });
  }

  base.resumen.baseMensualActual = baseCot ?? extraction.baseMensual;
  base.resumen.empresaActual = extraction.empresa;
  return base;
}

export function normalizeResolucion(
  extraction: FullDocumentExtraction,
  documentId: string,
  documentName: string,
  documentType: DocumentTypeKey
): NormalizedDocumentPayload {
  const base = normalizeFromVidaLaboral(extraction, documentId, documentName, documentType);
  const otros = extraction.informeCompleto.otrosDatos.resolucion as Record<string, unknown> | undefined;
  const source = prov(documentId, documentName, documentType, extraction.confidence);

  if (otros || documentType.startsWith('resolucion') || documentType === 'certificado_empresa') {
    const fecha =
      normalizeDate(String(otros?.fecha ?? '')) ??
      normalizeDate(extraction.informeCompleto.resumen.fechaInforme) ??
      null;
    const resumen =
      String(otros?.resumen ?? '').trim() ||
      [
        extraction.empresa,
        extraction.informeCompleto.periodosContrato[0]?.empresa,
      ]
        .filter(Boolean)
        .join(' · ') ||
      documentName;

    base.resoluciones.push({
      organismo: sv(
        String(
          otros?.organismo ??
            (documentType.includes('sepe')
              ? 'SEPE'
              : documentType === 'certificado_empresa'
                ? 'Empresa'
                : 'INSS')
        ),
        source
      ),
      numeroExpediente: sv(String(otros?.numeroExpediente ?? ''), source),
      fecha: fecha ? sv(fecha, source) : null,
      tipo: sv(String(otros?.tipo ?? documentType), source),
      resumen: sv(resumen, source),
      importe: sv(
        normalizeAmount(
          (otros?.importe as number) ??
            (extraction.informeCompleto.otrosDatos.importe as number) ??
            extraction.baseMensual
        ),
        source
      ),
    });
  }

  return base;
}

export function normalizePrestacion(
  extraction: FullDocumentExtraction,
  documentId: string,
  documentName: string,
  documentType: DocumentTypeKey
): NormalizedDocumentPayload {
  const base = normalizeFromVidaLaboral(extraction, documentId, documentName, documentType);
  const source = prov(documentId, documentName, documentType, extraction.confidence);
  const otros = extraction.informeCompleto.otrosDatos;

  if (base.prestaciones.length === 0 && otros.importe) {
    base.prestaciones.push({
      tipo: sv('prestacion_desempleo', source),
      organismo: sv('SEPE', source),
      numeroExpediente: sv(String(otros.numeroExpediente ?? ''), source),
      fechaInicio: null,
      fechaFin: null,
      dias: null,
      importe: sv(normalizeAmount(otros.importe as number), source),
      situacion: null,
      observaciones: null,
    });
  }

  return base;
}

export function normalizeCertificadoEmpresa(
  extraction: FullDocumentExtraction,
  documentId: string,
  documentName: string,
  documentType: DocumentTypeKey
): NormalizedDocumentPayload {
  const base = normalizeFromVidaLaboral(extraction, documentId, documentName, documentType);
  const source = prov(documentId, documentName, documentType, extraction.confidence);
  const otros = extraction.informeCompleto.otrosDatos;
  const ic = extraction.informeCompleto;

  // Resumen del certificado como resolución/evidencia
  const empresa =
    sanitizeCompanyName(extraction.empresa) ??
    ic.periodosContrato[0]?.empresa ??
    documentName;
  const alta = ic.periodosContrato[0]?.fechaAlta ?? null;
  const baja = ic.periodosContrato[0]?.fechaBaja ?? null;

  base.resoluciones.push({
    organismo: sv('Empresa', source),
    numeroExpediente: sv(String(otros.numeroExpediente ?? ''), source),
    fecha: sv(normalizeDate(ic.resumen.fechaInforme), source),
    tipo: sv('certificado_empresa', source),
    resumen: sv(
      [
        empresa,
        alta ? `alta ${alta}` : null,
        baja ? `baja ${baja}` : null,
        extraction.grupoCotizacion ? `grupo ${extraction.grupoCotizacion}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || documentName,
      source
    ),
    importe: sv(
      normalizeAmount(
        (otros.salarioBruto as number) ?? extraction.salarioBruto ?? extraction.baseMensual
      ),
      source
    ),
  });

  return base;
}

export function normalizeSimulacionJubilacion(
  extraction: FullDocumentExtraction,
  documentId: string,
  documentName: string,
  documentType: DocumentTypeKey
): NormalizedDocumentPayload {
  const base = normalizeFromVidaLaboral(extraction, documentId, documentName, documentType);
  const source = prov(documentId, documentName, documentType, extraction.confidence);
  const sim = (extraction.informeCompleto.otrosDatos.simulacion as Record<string, unknown>) ?? {};

  /** La simulación SS es solo referencia (pensión/BR), no aporta bases ni periodos reales. */
  base.bases = [];
  base.periodos = [];
  base.prestaciones = [];
  base.lagunas = [];

  const pension = normalizeAmount(
    (sim.pensionMensual as number) ?? extraction.baseMensual ?? null
  );
  const edad = typeof sim.edadJubilacion === 'number' ? sim.edadJubilacion : null;
  const fecha = normalizeDate(String(sim.fechaJubilacion ?? '')) ?? null;
  const br = normalizeAmount(sim.baseReguladora as number);

  base.resoluciones.push({
    organismo: sv('INSS / Seguridad Social', source),
    numeroExpediente: null,
    fecha: fecha ? sv(fecha, source) : null,
    tipo: sv('simulacion_jubilacion', source),
    resumen: sv(
      [
        'Simulación oficial SS',
        edad != null ? `edad ${edad}` : null,
        br != null ? `BR ${br} €` : null,
        pension != null ? `pensión ${pension} €/mes` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      source
    ),
    importe: pension != null ? sv(pension, source) : null,
  });

  if (typeof sim.anosCotizados === 'number' && !base.resumen.anosCotizados) {
    base.resumen.anosCotizados = sim.anosCotizados as number;
  }
  if (typeof sim.mesesCotizados === 'number' && !base.resumen.mesesCotizados) {
    base.resumen.mesesCotizados = sim.mesesCotizados as number;
  }

  return base;
}

export function normalizeByDocumentType(
  extraction: FullDocumentExtraction,
  documentId: string,
  documentName: string,
  documentType: DocumentTypeKey
): NormalizedDocumentPayload {
  switch (documentType) {
    case 'nomina':
      return normalizeNomina(extraction, documentId, documentName, documentType);
    case 'bases_cotizacion':
      return normalizeFromVidaLaboral(extraction, documentId, documentName, documentType);
    case 'certificado_empresa':
      return normalizeCertificadoEmpresa(extraction, documentId, documentName, documentType);
    case 'resolucion_inss':
    case 'resolucion_sepe':
      return normalizeResolucion(extraction, documentId, documentName, documentType);
    case 'prestacion_desempleo':
    case 'subsidio':
      return normalizePrestacion(extraction, documentId, documentName, documentType);
    case 'simulacion_jubilacion':
      return normalizeSimulacionJubilacion(extraction, documentId, documentName, documentType);
    case 'vida_laboral':
      return normalizeFromVidaLaboral(extraction, documentId, documentName, documentType);
    default:
      return normalizeFromVidaLaboral(extraction, documentId, documentName, documentType);
  }
}

/** @deprecated Usar normalizeByDocumentType */
export function normalizeGenericExtraction(
  extraction: FullDocumentExtraction,
  documentId: string,
  documentName: string,
  documentType: DocumentTypeKey
): NormalizedDocumentPayload {
  return normalizeByDocumentType(extraction, documentId, documentName, documentType);
}

export function attachIds(
  payload: NormalizedDocumentPayload,
  documentId: string,
  documentName: string,
  documentType: DocumentTypeKey
): {
  periodos: PeriodoLaboralNormalizado[];
  prestaciones: PrestacionNormalizada[];
  bases: BaseCotizacionNormalizada[];
  resoluciones: ResolucionNormalizada[];
} {
  const source = prov(documentId, documentName, documentType, payload.confidence);

  return {
    periodos: payload.periodos.map((p) => ({ ...p, id: newId(), sources: [source] })),
    prestaciones: payload.prestaciones.map((p) => ({ ...p, id: newId(), sources: [source] })),
    bases: payload.bases.map((b) => ({ ...b, id: newId(), sources: [source] })),
    resoluciones: payload.resoluciones.map((r) => ({ ...r, id: newId(), sources: [source] })),
  };
}

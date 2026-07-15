/**
 * Modelo canónico del expediente digital — única fuente de verdad para cálculos.
 * Toda extracción se normaliza aquí, con trazabilidad y detección de conflictos.
 */

import type { DocumentTypeKey } from './document-types';

export interface FieldProvenance {
  documentId: string;
  documentName: string;
  documentType: DocumentTypeKey;
  extractedAt: string;
  confidence?: number;
  pageHint?: string;
}

export interface SourcedValue<T> {
  value: T;
  sources: FieldProvenance[];
}

export interface IdentificacionExpediente {
  nombre: SourcedValue<string> | null;
  dni: SourcedValue<string> | null;
  nie: SourcedValue<string> | null;
  numeroAfiliacion: SourcedValue<string> | null;
  fechaNacimiento: SourcedValue<string> | null;
  edad: SourcedValue<number> | null;
  direccion: SourcedValue<string> | null;
  localidad: SourcedValue<string> | null;
  provincia: SourcedValue<string> | null;
  codigoPostal: SourcedValue<string> | null;
}

export interface PeriodoLaboralNormalizado {
  id: string;
  empresa: SourcedValue<string> | null;
  ccc: SourcedValue<string> | null;
  fechaAlta: SourcedValue<string> | null;
  fechaBaja: SourcedValue<string> | null;
  tipoContrato: SourcedValue<string> | null;
  regimen: SourcedValue<string> | null;
  grupoCotizacion: SourcedValue<string> | null;
  situacion: SourcedValue<string> | null;
  diasCotizados: SourcedValue<number> | null;
  baseCotizacion: SourcedValue<number> | null;
  salario: SourcedValue<number> | null;
  categoria: 'contrato' | 'autonomo' | 'asimilada' | 'convenio' | 'otro';
  sources: FieldProvenance[];
}

export interface PrestacionNormalizada {
  id: string;
  tipo: SourcedValue<string> | null;
  organismo: SourcedValue<string> | null;
  numeroExpediente: SourcedValue<string> | null;
  fechaInicio: SourcedValue<string> | null;
  fechaFin: SourcedValue<string> | null;
  dias: SourcedValue<number> | null;
  importe: SourcedValue<number> | null;
  situacion: SourcedValue<string> | null;
  observaciones: SourcedValue<string> | null;
  sources: FieldProvenance[];
}

export interface BaseCotizacionNormalizada {
  id: string;
  periodo: SourcedValue<string> | null;
  base: SourcedValue<number> | null;
  regimen: SourcedValue<string> | null;
  empresa: SourcedValue<string> | null;
  sources: FieldProvenance[];
}

export interface ResolucionNormalizada {
  id: string;
  organismo: SourcedValue<string> | null;
  numeroExpediente: SourcedValue<string> | null;
  fecha: SourcedValue<string> | null;
  tipo: SourcedValue<string> | null;
  resumen: SourcedValue<string> | null;
  importe: SourcedValue<number> | null;
  sources: FieldProvenance[];
}

export interface ResumenExpediente {
  totalDiasCotizacion: SourcedValue<number> | null;
  anosCotizados: SourcedValue<number> | null;
  mesesCotizados: SourcedValue<number> | null;
  regimenPrincipal: SourcedValue<string> | null;
  situacionActual: SourcedValue<string> | null;
  empresaActual: SourcedValue<string> | null;
  baseMensualActual: SourcedValue<number> | null;
}

export type DiscrepancySeverity = 'info' | 'warning' | 'error';

export interface Discrepancy {
  id: string;
  field: string;
  severity: DiscrepancySeverity;
  message: string;
  values: Array<{ value: string; documentId: string; documentName: string }>;
  detectedAt: string;
  resolved: boolean;
}

export interface ExpedienteDigital {
  version: number;
  userId: string;
  identificacion: IdentificacionExpediente;
  resumen: ResumenExpediente;
  periodos: PeriodoLaboralNormalizado[];
  prestaciones: PrestacionNormalizada[];
  bases: BaseCotizacionNormalizada[];
  resoluciones: ResolucionNormalizada[];
  lagunas: Array<{
    desde: SourcedValue<string> | null;
    hasta: SourcedValue<string> | null;
    dias: SourcedValue<number> | null;
    sources: FieldProvenance[];
  }>;
  discrepancies: Discrepancy[];
  documentIds: string[];
  completitud: {
    score: number;
    documentosProcesados: number;
    camposCriticosFaltantes: string[];
  };
  pendingQuestions?: Array<{
    id: string;
    field: string;
    question: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  advisor?: {
    summary: string;
    risks: string[];
    opportunities: string[];
    updatedAt: string;
  };
  updatedAt: string;
}

export function emptyExpediente(userId: string): ExpedienteDigital {
  return {
    version: 1,
    userId,
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
      regimenPrincipal: null,
      situacionActual: null,
      empresaActual: null,
      baseMensualActual: null,
    },
    periodos: [],
    prestaciones: [],
    bases: [],
    resoluciones: [],
    lagunas: [],
    discrepancies: [],
    documentIds: [],
    completitud: {
      score: 0,
      documentosProcesados: 0,
      camposCriticosFaltantes: [
        'nombre',
        'numeroAfiliacion',
        'anosCotizados',
        'vida_laboral',
      ],
    },
    updatedAt: new Date().toISOString(),
  };
}

export function newId(): string {
  return crypto.randomUUID();
}

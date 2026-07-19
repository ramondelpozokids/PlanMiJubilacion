/** Tipos compartidos — sin dependencias de servidor (seguro en client components). */

export interface PeriodoLaboral {
  fechaAlta: string | null;
  fechaBaja: string | null;
  empresa: string | null;
  ccc: string | null;
  regimen: string | null;
  situacion: string | null;
  grupoCotizacion: string | null;
  diasCotizados: number | null;
  tipo: 'contrato' | 'autonomo' | 'otro';
}

export interface PrestacionDesempleo {
  tipo: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  dias: number | null;
  situacion: string | null;
  observaciones: string | null;
}

export interface DatosIdentificativos {
  nombre: string | null;
  dni: string | null;
  nie: string | null;
  numeroAfiliacion: string | null;
  fechaNacimiento: string | null;
  edad: number | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
}

export interface ResumenCotizacion {
  totalDiasCotizacion: number | null;
  anosCotizados: number | null;
  mesesCotizados: number | null;
  diasRestantes: number | null;
  regimenPrincipal: string | null;
  situacionActual: string | null;
  fechaInforme: string | null;
  /** Días en alta (incluye solapes). Informativo; no usar en pensión. */
  diasAltaTotal?: number | null;
  /** Días de pluriempleo/pluriactividad = alta − computables. */
  diasPluriempleo?: number | null;
}

export interface BaseCotizacionMes {
  periodo: string | null;
  base: number | null;
  regimen: string | null;
}

export interface VidaLaboralCompleta {
  documentType: string;
  identificacion: DatosIdentificativos;
  resumen: ResumenCotizacion;
  periodosContrato: PeriodoLaboral[];
  periodosAutonomo: PeriodoLaboral[];
  prestacionesDesempleo: PrestacionDesempleo[];
  situacionesAsimiladas: PeriodoLaboral[];
  lagunas: Array<{ desde: string | null; hasta: string | null; dias: number | null }>;
  basesCotizacion: BaseCotizacionMes[];
  otrosDatos: Record<string, unknown>;
  paginasProcesadas: number;
  totalPeriodosExtraidos: number;
}

export interface FullDocumentExtraction {
  informeCompleto: VidaLaboralCompleta;
  rawText: string;
  confidence: number;
  nombre: string | null;
  fechaNacimiento: string | null;
  edad: number | null;
  empresa: string | null;
  regimen: string | null;
  grupoCotizacion: string | null;
  salarioBruto: number | null;
  baseMensual: number | null;
  basesUltimos24: number[];
  anosCotizados: number | null;
  mesesCotizados: number | null;
  lagunas: Array<{ desde: string; hasta: string; meses: number }>;
  actualmenteTrabajando: boolean | null;
  esAutonomo: boolean | null;
}

export function isFullDocumentExtraction(data: unknown): data is FullDocumentExtraction {
  return (
    typeof data === 'object' &&
    data != null &&
    'informeCompleto' in data &&
    typeof (data as FullDocumentExtraction).informeCompleto === 'object'
  );
}

export function countFullExtractionFields(data: FullDocumentExtraction): number {
  const ic = data.informeCompleto;
  let n = 0;
  const id = ic.identificacion;
  if (id.nombre) n++;
  if (id.dni || id.nie) n++;
  if (id.numeroAfiliacion) n++;
  if (id.fechaNacimiento) n++;
  if (id.direccion) n++;
  if (ic.resumen.anosCotizados != null) n++;
  if (ic.resumen.totalDiasCotizacion != null) n++;
  n += ic.periodosContrato.length;
  n += ic.periodosAutonomo.length;
  n += ic.prestacionesDesempleo.length;
  n += ic.basesCotizacion.length;
  if (data.empresa) n++;
  if (data.baseMensual != null) n++;
  return n;
}

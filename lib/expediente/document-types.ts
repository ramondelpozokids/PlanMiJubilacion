/** Tipos documentales aceptados — extensible. */
export const DOCUMENT_TYPES = {
  vida_laboral: 'Informe de Vida Laboral',
  bases_cotizacion: 'Informe de Bases de Cotización',
  simulacion_jubilacion: 'Simulación de Jubilación',
  resolucion_inss: 'Resolución del INSS',
  certificado_empresa: 'Certificado de empresa',
  nomina: 'Nómina',
  prestacion_desempleo: 'Prestación por desempleo',
  resolucion_sepe: 'Resolución del SEPE',
  subsidio: 'Subsidio',
  convenio_especial: 'Convenio Especial',
  incapacidad_temporal: 'Incapacidad Temporal',
  incapacidad_permanente: 'Incapacidad Permanente',
  vida_laboral_internacional: 'Vida laboral internacional',
  certificado_europeo: 'Certificado de cotización europeo',
  declaracion_fiscal: 'Declaración fiscal',
  otro: 'Otro documento SS',
} as const;

export type DocumentTypeKey = keyof typeof DOCUMENT_TYPES;

export const DOCUMENT_TYPE_KEYS = Object.keys(DOCUMENT_TYPES) as DocumentTypeKey[];

/** Compatibilidad con valores legacy en BD */
export const LEGACY_TYPE_MAP: Record<string, DocumentTypeKey> = {
  bases: 'bases_cotizacion',
  resolucion: 'resolucion_inss',
};

export function normalizeDocumentType(raw: string | null | undefined): DocumentTypeKey {
  if (!raw) return 'otro';
  if (raw in DOCUMENT_TYPES) return raw as DocumentTypeKey;
  return LEGACY_TYPE_MAP[raw] ?? 'otro';
}

export function detectDocumentTypeFromText(
  text: string,
  fileName: string
): DocumentTypeKey {
  const lower = `${fileName} ${text.slice(0, 4000)}`.toLowerCase();

  if (/vida laboral/i.test(lower)) return 'vida_laboral';
  if (/bases de cotizaci|informe integral de bases/i.test(lower)) return 'bases_cotizacion';
  if (/simulaci[oó]n.*jubilaci|informe de simulaci[oó]n/i.test(lower)) return 'simulacion_jubilacion';
  if (/resoluci[oó]n.*inss|instituto nacional/i.test(lower)) return 'resolucion_inss';
  if (/certificado.*empresa|certificaci[oó]n.*empresa/i.test(lower)) return 'certificado_empresa';
  if (/n[oó]mina|recibo de salario/i.test(lower)) return 'nomina';
  if (/sepe|servicio p[uú]blico de empleo|desempleo|paro/i.test(lower))
    return /resoluci/i.test(lower) ? 'resolucion_sepe' : 'prestacion_desempleo';
  if (/subsidio/i.test(lower)) return 'subsidio';
  if (/convenio especial/i.test(lower)) return 'convenio_especial';
  if (/incapacidad temporal|baja m[eé]dica/i.test(lower)) return 'incapacidad_temporal';
  if (/incapacidad permanente/i.test(lower)) return 'incapacidad_permanente';
  if (/regulation \(eu\)|certificado europeo|formulario e/i.test(lower))
    return 'certificado_europeo';
  if (/declaraci[oó]n.*irpf|modelo 100|modelo 130/i.test(lower)) return 'declaracion_fiscal';

  return 'otro';
}

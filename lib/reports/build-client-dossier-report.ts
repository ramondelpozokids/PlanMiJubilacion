/**
 * Informe-dossier completo del cliente: toda la documentación del expediente
 * + inventario de PDFs aportados + cálculo de jubilación (bruto/neto).
 */
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import type { LifePathAssumptions } from '@/lib/calculator/life-path';
import { DEFAULT_LIFE_PATH } from '@/lib/calculator/life-path';
import { buildRetirementOutlook, type RetirementOutlook } from '@/lib/calculator/retirement-outlook';
import { resolveExpedienteAsOf, formatContributionLabel } from '@/lib/expediente/as-of';
import {
  DOCUMENT_TYPES,
  normalizeDocumentType,
  type DocumentTypeKey,
} from '@/lib/expediente/document-types';
import {
  buildRetirementPrintReport,
  type RetirementPrintReport,
} from '@/lib/reports/build-retirement-print-report';
import { evaluateInternationalCoordination } from '@/lib/international-coordination/evaluate';
import { DEFAULT_ISSUER } from '@/lib/billing/documents';
import { pensionPaymentsLabel } from '@/lib/calculator/pension-pay';

export interface DossierDocumentRow {
  id: string;
  name: string;
  typeKey: DocumentTypeKey;
  typeLabel: string;
  status: string | null;
  uploadedAt: string | null;
  uploadedAtLabel: string;
}

export interface DossierPeriodRow {
  alta: string;
  baja: string;
  empresa: string;
  ccc: string;
  regimen: string;
  tipo: string;
  categoria: string;
  dias: string;
  origen: string;
}

export interface DossierPrestacionRow {
  tipo: string;
  organismo: string;
  inicio: string;
  fin: string;
  dias: string;
  importe: string | null;
  origen: string;
}

export interface DossierResolucionRow {
  tipo: string;
  organismo: string;
  fecha: string;
  resumen: string;
  importe: string | null;
  origen: string;
}

export interface DossierBaseRow {
  periodo: string;
  base: number | null;
  regimen: string;
  empresa: string;
  origen: string;
}

export interface DossierLagunaRow {
  desde: string;
  hasta: string;
  dias: string;
}

export interface DossierIntlRow {
  country: string;
  years: string;
  dates: string;
  documentedMonthly: number | null;
  source: string;
}

export interface ClientDossierReport {
  reportNumber: string;
  issuedAtLabel: string;
  verificationId: string;
  clientName: string;
  variant: 'self' | 'consultation';
  issuer: typeof DEFAULT_ISSUER;
  /** Bloque de jubilación (reutilizado). */
  retirement: RetirementPrintReport;
  outlook: RetirementOutlook | null;
  identification: Array<{ label: string; value: string }>;
  resumenCotizacion: Array<{ label: string; value: string }>;
  carreraLabel: string;
  documents: DossierDocumentRow[];
  periodos: DossierPeriodRow[];
  prestaciones: DossierPrestacionRow[];
  resoluciones: DossierResolucionRow[];
  bases: DossierBaseRow[];
  basesSum: number;
  basesCount: number;
  lagunas: DossierLagunaRow[];
  international: DossierIntlRow[];
  internationalNote: string | null;
  discrepancies: Array<{ severity: string; field: string; message: string }>;
  pendingQuestions: Array<{ question: string; reason: string; priority: string }>;
  advisorSummary: string | null;
  summaryLines: string[];
  paymentsLabel: string;
  disclaimer: string;
}

export type DossierDocumentInput = {
  id: string;
  name: string;
  document_type: string | null;
  ocr_status: string | null;
  created_at: string | null;
};

function sv(v: { value: unknown } | null | undefined): string {
  if (v?.value == null || v.value === '') return '—';
  return String(v.value);
}

function moneyOrNull(n: unknown): string | null {
  if (n == null || n === '') return null;
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  return num.toFixed(2);
}

function formatUploadedAt(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), "d 'de' MMMM yyyy, HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

function sortPeriodosAltaDesc(a: DossierPeriodRow, b: DossierPeriodRow): number {
  const parse = (s: string) => {
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return 0;
    return new Date(+m[3], +m[2] - 1, +m[1]).getTime();
  };
  return parse(b.alta) - parse(a.alta);
}

function sortBasesDesc(a: DossierBaseRow, b: DossierBaseRow): number {
  return b.periodo.localeCompare(a.periodo);
}

/**
 * Construye el dossier completo. Devuelve null si no hay datos mínimos de jubilación
 * y tampoco documentación en el expediente.
 */
export function buildClientDossierReport(
  expediente: ExpedienteDigital,
  options: {
    clientName?: string;
    lifePath?: LifePathAssumptions;
    variant?: 'self' | 'consultation';
    documents?: DossierDocumentInput[];
    summaryLines?: string[];
    asOf?: Date;
  } = {}
): ClientDossierReport | null {
  const lifePath = options.lifePath ?? DEFAULT_LIFE_PATH;
  const asOf = options.asOf ?? resolveExpedienteAsOf(expediente);
  const variant = options.variant ?? 'self';
  const name =
    options.clientName?.trim() ||
    expediente.identificacion.nombre?.value ||
    'Titular';

  const hasContent =
    expediente.documentIds.length > 0 ||
    expediente.periodos.length > 0 ||
    expediente.bases.length > 0 ||
    (options.documents?.length ?? 0) > 0;

  if (!hasContent) return null;

  const retirement = buildRetirementPrintReport(expediente, {
    clientName: name,
    lifePath,
    asOf,
  });

  // Si no hay cálculo de jubilación aún, fabricamos un stub mínimo para cabecera.
  const retirementBlock: RetirementPrintReport =
    retirement ??
    ({
      reportNumber: `INF-EXP-${asOf.getFullYear()}`,
      issuedAtLabel: format(asOf, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es }),
      verificationId: crypto.randomUUID(),
      clientName: name,
      clientDni: expediente.identificacion.dni?.value ?? null,
      clientBirth: expediente.identificacion.fechaNacimiento?.value ?? null,
      issuer: DEFAULT_ISSUER,
      retirementDateLabel: '—',
      retirementAgeLabel: '—',
      modalityLabel: 'Expediente documental',
      annualPayments: 14,
      real: {
        monthlyBruto: null,
        annualBruto: null,
        baseReguladora: null,
        percentageByYears: null,
        reductionPercent: 0,
        irpfRows: [],
      },
      officialSs: {
        monthlyBruto: null,
        annualBruto: null,
        dateLabel: null,
        note: '',
      },
      lifePathTramos: { paro: null, subsidio: null },
      disclaimer:
        'Expediente orientativo. Completa vida laboral y bases para estimar la pensión.',
    } satisfies RetirementPrintReport);

  const outlook = buildRetirementOutlook(expediente, asOf, lifePath);

  const id = expediente.identificacion;
  const identification = [
    { label: 'Nombre', value: sv(id.nombre) },
    { label: 'DNI', value: sv(id.dni) },
    { label: 'NIE', value: sv(id.nie) },
    { label: 'Nº afiliación', value: sv(id.numeroAfiliacion) },
    { label: 'Fecha nacimiento', value: sv(id.fechaNacimiento) },
    { label: 'Edad', value: sv(id.edad) },
    { label: 'Dirección', value: sv(id.direccion) },
    { label: 'Localidad', value: sv(id.localidad) },
    { label: 'Provincia', value: sv(id.provincia) },
    { label: 'C.P.', value: sv(id.codigoPostal) },
  ].filter((r) => r.value !== '—');

  const r = expediente.resumen;
  const resumenCotizacion = [
    { label: 'Fecha del informe VL', value: sv(r.fechaInforme) },
    { label: 'Carrera computable', value: formatContributionLabel(expediente) },
    {
      label: 'Días computables',
      value:
        r.totalDiasCotizacion?.value != null
          ? Number(r.totalDiasCotizacion.value).toLocaleString('es-ES')
          : '—',
    },
    {
      label: 'Días en alta (informativo)',
      value:
        r.diasAltaTotal?.value != null
          ? Number(r.diasAltaTotal.value).toLocaleString('es-ES')
          : '—',
    },
    {
      label: 'Días pluriempleo',
      value:
        r.diasPluriempleo?.value != null
          ? Number(r.diasPluriempleo.value).toLocaleString('es-ES')
          : '—',
    },
    { label: 'Régimen principal', value: sv(r.regimenPrincipal) },
    { label: 'Situación actual', value: sv(r.situacionActual) },
    { label: 'Empresa actual', value: sv(r.empresaActual) },
    {
      label: 'Última base mensual',
      value:
        r.baseMensualActual?.value != null
          ? `${Number(r.baseMensualActual.value).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
          : '—',
    },
    {
      label: 'Completitud expediente',
      value: `${expediente.completitud.score}%`,
    },
  ].filter((row) => row.value !== '—');

  const documents: DossierDocumentRow[] = (options.documents ?? [])
    .map((d) => {
      const typeKey = normalizeDocumentType(d.document_type);
      return {
        id: d.id,
        name: d.name,
        typeKey,
        typeLabel: DOCUMENT_TYPES[typeKey],
        status: d.ocr_status,
        uploadedAt: d.created_at,
        uploadedAtLabel: formatUploadedAt(d.created_at),
      };
    })
    .sort((a, b) => (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? ''));

  const periodos: DossierPeriodRow[] = expediente.periodos
    .map((p) => ({
      alta: sv(p.fechaAlta),
      baja: sv(p.fechaBaja),
      empresa: sv(p.empresa),
      ccc: sv(p.ccc),
      regimen: sv(p.regimen),
      tipo: sv(p.tipoContrato),
      categoria: p.categoria,
      dias: sv(p.diasCotizados),
      origen: p.sources.map((s) => s.documentName).filter(Boolean).join(', ') || '—',
    }))
    .sort(sortPeriodosAltaDesc);

  const prestaciones: DossierPrestacionRow[] = expediente.prestaciones.map((p) => ({
    tipo: sv(p.tipo),
    organismo: sv(p.organismo),
    inicio: sv(p.fechaInicio),
    fin: sv(p.fechaFin),
    dias: sv(p.dias),
    importe: moneyOrNull(p.importe?.value),
    origen: p.sources.map((s) => s.documentName).filter(Boolean).join(', ') || '—',
  }));

  const resoluciones: DossierResolucionRow[] = expediente.resoluciones.map((x) => ({
    tipo: sv(x.tipo),
    organismo: sv(x.organismo),
    fecha: sv(x.fecha),
    resumen: sv(x.resumen),
    importe: moneyOrNull(x.importe?.value),
    origen: x.sources[0]?.documentName ?? '—',
  }));

  const bases: DossierBaseRow[] = expediente.bases
    .map((b) => ({
      periodo: sv(b.periodo),
      base: b.base?.value != null ? Number(b.base.value) : null,
      regimen: sv(b.regimen),
      empresa: sv(b.empresa),
      origen: b.sources[0]?.documentName ?? '—',
    }))
    .sort(sortBasesDesc);

  const basesSum = bases.reduce((acc, b) => acc + (b.base ?? 0), 0);

  const lagunas: DossierLagunaRow[] = expediente.lagunas.map((l) => ({
    desde: sv(l.desde),
    hasta: sv(l.hasta),
    dias: sv(l.dias),
  }));

  const intlEval = evaluateInternationalCoordination(expediente.internationalCotizaciones);
  const international: DossierIntlRow[] = (expediente.internationalCotizaciones?.periods ?? []).map(
    (p) => ({
      country: p.countryName || p.countryCode,
      years: p.yearsContributed != null ? String(p.yearsContributed) : '—',
      dates: [p.approximateStart, p.approximateEnd].filter(Boolean).join(' → ') || '—',
      documentedMonthly: p.documentedMonthlyPensionEur,
      source: p.documentedPensionSource ?? '—',
    })
  );

  const y = asOf.getFullYear();
  const seq = `${asOf.getMonth() + 1}${String(asOf.getDate()).padStart(2, '0')}`;
  const reportNumber = `INF-DOS-${y}-${seq}-${name
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase()}`;

  return {
    reportNumber,
    issuedAtLabel: format(asOf, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es }),
    verificationId: retirementBlock.verificationId,
    clientName: name,
    variant,
    issuer: DEFAULT_ISSUER,
    retirement: { ...retirementBlock, reportNumber },
    outlook,
    identification,
    resumenCotizacion,
    carreraLabel: formatContributionLabel(expediente),
    documents,
    periodos,
    prestaciones,
    resoluciones,
    bases,
    basesSum,
    basesCount: bases.length,
    lagunas,
    international,
    internationalNote: intlEval?.summaryLines?.[0] ?? null,
    discrepancies: expediente.discrepancies
      .filter((d) => !d.resolved)
      .map((d) => ({
        severity: d.severity,
        field: d.field,
        message: d.message,
      })),
    pendingQuestions: (expediente.pendingQuestions ?? []).map((q) => ({
      question: q.question,
      reason: q.reason,
      priority: q.priority,
    })),
    advisorSummary: expediente.advisor?.summary ?? null,
    summaryLines: options.summaryLines ?? [],
    paymentsLabel: pensionPaymentsLabel(),
    disclaimer:
      'Informe-dossier orientativo de PlanMiJubilación. Incluye toda la documentación aportada y el cálculo estimado. No sustituye resoluciones del INSS ni el cálculo oficial de la Seguridad Social. El IRPF es estimativo; la retención real la fija la AEAT.',
  };
}

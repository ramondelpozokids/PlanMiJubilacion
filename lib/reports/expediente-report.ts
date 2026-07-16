/**
 * Informes — generan resúmenes del expediente sin re-analizar PDFs.
 */
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { buildRetirementOutlook } from '@/lib/calculator/retirement-outlook';
import { evaluateInternationalCoordination } from '@/lib/international-coordination/evaluate';

export interface ExpedienteReportSummary {
  title: string;
  generatedAt: string;
  identity: {
    nombre: string | null;
    dni: string | null;
    numeroAfiliacion: string | null;
    fechaNacimiento: string | null;
  };
  cotizacion: {
    anos: number | null;
    meses: number | null;
    regimen: string | null;
    empresaActual: string | null;
    baseMensual: number | null;
  };
  counts: {
    periodos: number;
    prestaciones: number;
    bases: number;
    lagunas: number;
    discrepancias: number;
    documentos: number;
  };
  completitud: number;
  edadJubilacionOrdinaria: number | null;
  fechaJubilacionOrdinaria: string | null;
  advisorSummary: string | null;
  risks: string[];
  opportunities: string[];
  pendingQuestions: string[];
  /** Pipeline ERP subsidio +52 (bruto→…→informe) */
  subsidioPipeline: {
    fingerprint: string;
    formulaBruto: string;
    steps: Array<{ id: string; label: string; value: string }>;
    comparativa: {
      tuEscenario: number | null;
      freeze: number | null;
      simSs: number | null;
    };
  } | null;
  international: {
    active: boolean;
    countries: string[];
    totalizationPossible: boolean;
    summaryLines: string[];
  } | null;
}

export function buildExpedienteReport(expediente: ExpedienteDigital): ExpedienteReportSummary {
  const outlook = buildRetirementOutlook(expediente);
  const pipe = outlook?.erpPipeline ?? null;
  const intl = evaluateInternationalCoordination(expediente.internationalCotizaciones);
  return {
    title: 'Informe de expediente digital',
    generatedAt: new Date().toISOString(),
    identity: {
      nombre: expediente.identificacion.nombre?.value ?? null,
      dni: expediente.identificacion.dni?.value ?? expediente.identificacion.nie?.value ?? null,
      numeroAfiliacion: expediente.identificacion.numeroAfiliacion?.value ?? null,
      fechaNacimiento: expediente.identificacion.fechaNacimiento?.value ?? null,
    },
    cotizacion: {
      anos: expediente.resumen.anosCotizados?.value ?? null,
      meses: expediente.resumen.mesesCotizados?.value ?? null,
      regimen: expediente.resumen.regimenPrincipal?.value ?? null,
      empresaActual: expediente.resumen.empresaActual?.value ?? null,
      baseMensual: expediente.resumen.baseMensualActual?.value ?? null,
    },
    counts: {
      periodos: expediente.periodos.length,
      prestaciones: expediente.prestaciones.length,
      bases: expediente.bases.length,
      lagunas: expediente.lagunas.length,
      discrepancias: expediente.discrepancies.filter((d) => !d.resolved).length,
      documentos: expediente.documentIds.length,
    },
    completitud: expediente.completitud.score,
    edadJubilacionOrdinaria: outlook?.ordinary.ageYears ?? null,
    fechaJubilacionOrdinaria: outlook?.ordinary.dateLabel ?? null,
    advisorSummary: expediente.advisor?.summary ?? null,
    risks: expediente.advisor?.risks ?? [],
    opportunities: expediente.advisor?.opportunities ?? [],
    pendingQuestions: (expediente.pendingQuestions ?? []).map((q) => q.question),
    subsidioPipeline: pipe
      ? {
          fingerprint: pipe.paramsFingerprint,
          formulaBruto: pipe.informe.formulaBruto,
          steps: pipe.informe.steps,
          comparativa: {
            tuEscenario: pipe.comparativa.tuEscenario.pensionMensual,
            freeze: pipe.comparativa.sinCotizarMas.pensionMensual,
            simSs: pipe.comparativa.simulacionSs.pensionMensual,
          },
        }
      : null,
    international: intl
      ? {
          active: true,
          countries: intl.evaluations.map((e) => e.country.name),
          totalizationPossible: intl.totalizationPossibleAny,
          summaryLines: intl.summaryLines,
        }
      : null,
  };
}

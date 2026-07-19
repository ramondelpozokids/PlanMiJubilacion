/**
 * Checklist de calidad antes de entregar / cobrar un informe de consulta.
 */
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { normalizeDocumentType } from '@/lib/expediente/document-types';
import { canCalculateFromExpediente } from '@/lib/calculator/from-expediente';
import type { DossierDocumentInput } from '@/lib/reports/build-client-dossier-report';

export type ChecklistSeverity = 'ok' | 'warn' | 'block';

export interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
  severity: ChecklistSeverity;
}

export interface ConsultationDeliveryChecklist {
  readyToSend: boolean;
  blockingCount: number;
  warningCount: number;
  okCount: number;
  items: ChecklistItem[];
}

function hasBirth(expediente: ExpedienteDigital, clientBirthDate?: string | null): boolean {
  if (clientBirthDate && /^\d{4}-\d{2}-\d{2}$/.test(clientBirthDate)) return true;
  const raw = expediente.identificacion.fechaNacimiento?.value;
  return Boolean(raw && String(raw).trim());
}

function docsOfType(documents: DossierDocumentInput[], type: string): DossierDocumentInput[] {
  return documents.filter((d) => normalizeDocumentType(d.document_type) === type);
}

export function buildConsultationDeliveryChecklist(options: {
  expediente: ExpedienteDigital;
  documents: DossierDocumentInput[];
  clientBirthDate?: string | null;
}): ConsultationDeliveryChecklist {
  const { expediente, documents, clientBirthDate } = options;
  const items: ChecklistItem[] = [];

  const birthOk = hasBirth(expediente, clientBirthDate);
  items.push({
    id: 'birth',
    label: 'Fecha de nacimiento',
    detail: birthOk
      ? 'Disponible para calcular la edad ordinaria.'
      : 'Falta la fecha de nacimiento (en el caso o en la vida laboral).',
    severity: birthOk ? 'ok' : 'block',
  });

  const vlDocs = docsOfType(documents, 'vida_laboral');
  const hasPeriodos = expediente.periodos.length > 0;
  items.push({
    id: 'vida_laboral',
    label: 'Vida laboral',
    detail: hasPeriodos
      ? `${expediente.periodos.length} periodos fusionados` +
        (expediente.resumen.fechaInforme?.value
          ? ` · informe ${expediente.resumen.fechaInforme.value}`
          : '')
      : vlDocs.length > 0
        ? 'Hay PDF de vida laboral pero aún no hay periodos fusionados (Releer).'
        : 'Sube el informe de vida laboral.',
    severity: hasPeriodos ? 'ok' : vlDocs.length > 0 ? 'warn' : 'block',
  });

  const basesDocs = docsOfType(documents, 'bases_cotizacion');
  const basesCount = expediente.bases.length;
  items.push({
    id: 'bases',
    label: 'Bases de cotización',
    detail:
      basesCount >= 12
        ? `${basesCount} meses documentados.`
        : basesCount > 0
          ? `Solo ${basesCount} meses: la estimación de pensión será poco fiable.`
          : basesDocs.length > 0
            ? 'Hay PDF de bases sin meses fusionados (Releer el informe integral).'
            : 'Sube el Informe Integral de Bases de Cotización.',
    severity: basesCount >= 12 ? 'ok' : basesCount > 0 ? 'warn' : 'block',
  });

  const pendingOcr = documents.filter(
    (d) => d.ocr_status === 'pending' || d.ocr_status === 'processing'
  );
  const failedOcr = documents.filter((d) => d.ocr_status === 'failed');
  items.push({
    id: 'ocr',
    label: 'Procesado de documentos',
    detail:
      documents.length === 0
        ? 'No hay documentos subidos.'
        : pendingOcr.length > 0
          ? `${pendingOcr.length} documento(s) aún en cola o procesándose.`
          : failedOcr.length > 0
            ? `${failedOcr.length} documento(s) con error de lectura.`
            : `${documents.length} documento(s) listos.`,
    severity:
      documents.length === 0
        ? 'block'
        : pendingOcr.length > 0 || failedOcr.length > 0
          ? 'warn'
          : 'ok',
  });

  const canCalc = canCalculateFromExpediente(expediente);
  items.push({
    id: 'pension',
    label: 'Cálculo de pensión',
    detail: canCalc
      ? 'Hay datos suficientes para estimar la pensión.'
      : 'Aún no se puede calcular una pensión fiable (faltan datos críticos).',
    severity: canCalc ? 'ok' : 'block',
  });

  const score = expediente.completitud.score;
  items.push({
    id: 'completitud',
    label: 'Completitud del expediente',
    detail:
      score >= 70
        ? `Completitud ${score}%.`
        : `Completitud ${score}%. Campos críticos: ${
            expediente.completitud.camposCriticosFaltantes.join(', ') || 'revisar documentos'
          }.`,
    severity: score >= 70 ? 'ok' : score >= 40 ? 'warn' : 'block',
  });

  const openDisc = expediente.discrepancies.filter((d) => !d.resolved);
  if (openDisc.length > 0) {
    items.push({
      id: 'discrepancies',
      label: 'Discrepancias abiertas',
      detail: `${openDisc.length} alerta(s) sin resolver en el expediente.`,
      severity: 'warn',
    });
  } else {
    items.push({
      id: 'discrepancies',
      label: 'Discrepancias',
      detail: 'Sin discrepancias abiertas.',
      severity: 'ok',
    });
  }

  const blockingCount = items.filter((i) => i.severity === 'block').length;
  const warningCount = items.filter((i) => i.severity === 'warn').length;
  const okCount = items.filter((i) => i.severity === 'ok').length;

  return {
    readyToSend: blockingCount === 0,
    blockingCount,
    warningCount,
    okCount,
    items,
  };
}

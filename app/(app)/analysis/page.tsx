import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient, getProfile } from '@/lib/supabase/server';
import Link from 'next/link';
import { DocumentList } from '@/components/features/document-list';
import { ExpedienteReport } from '@/components/features/expediente-report';
import { VidaLaboralReport } from '@/components/features/vida-laboral-report';
import { OpenAiConfigBanner } from '@/components/features/openai-config-banner';
import { ProcessingAutoRefresh } from '@/components/features/processing-auto-refresh';
import { loadExpediente } from '@/lib/expediente/repository';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { isFullDocumentExtraction } from '@/lib/ai/vida-laboral-types';
import { buildExpedienteReport } from '@/lib/reports/expediente-report';
import { buildRetirementOutlook } from '@/lib/calculator/retirement-outlook';

type Document = {
  id: string;
  name: string;
  document_type: string | null;
  ocr_status: string | null;
  created_at: string | null;
  ocr_error?: string | null;
  ocr_data?: unknown;
  ocr_confidence?: number | null;
};

export const metadata = { title: 'Expediente', robots: { index: false } };

export default async function AnalysisPage() {
  const profile = await getProfile();
  const supabase = await createClient();

  const [{ data: documentsData }, expedienteRaw] = await Promise.all([
    supabase
      .from('documents')
      .select(
        'id, name, document_type, ocr_status, created_at, ocr_error, ocr_data, ocr_confidence'
      )
      .eq('user_id', profile!.id)
      .order('created_at', { ascending: false }),
    loadExpediente(profile!.id),
  ]);

  const documents = (documentsData ?? []) as Document[];
  const expediente = expedienteRaw as ExpedienteDigital | null;
  const latestDoc = documents.find((d) => d.ocr_status === 'completed' && d.ocr_data);
  const stuckCount = documents.filter(
    (d) => d.ocr_status === 'processing' || d.ocr_status === 'pending'
  ).length;
  const report =
    expediente && expediente.documentIds.length > 0
      ? buildExpedienteReport(expediente)
      : null;
  const hasExpediente = Boolean(expediente && expediente.documentIds.length > 0);
  const outlook = hasExpediente && expediente ? buildRetirementOutlook(expediente) : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Tu expediente</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Toda la información extraída de tus PDF, fusionada en un solo sitio. Aquí está lo que
          buscas — no hace falta abrir documento por documento.
        </p>
      </header>

      <OpenAiConfigBanner />
      <ProcessingAutoRefresh active={stuckCount > 0} />

      {stuckCount > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          {stuckCount} documento(s) en cola o procesándose…
        </div>
      )}

      {report && (
        <p className="text-xs text-muted-foreground">
          Informe {new Date(report.generatedAt).toLocaleString('es-ES')}
          {report.fechaJubilacionOrdinaria
            ? ` · Jubilación ordinaria: ${report.fechaJubilacionOrdinaria}`
            : ''}
        </p>
      )}

      {hasExpediente ? (
        <ExpedienteReport expediente={expediente!} outlook={outlook} />
      ) : latestDoc && isFullDocumentExtraction(latestDoc.ocr_data) ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Ejecuta migración 004_expediente.sql y vuelve a procesar para el expediente unificado.
            Vista del último documento:
          </p>
          <VidaLaboralReport data={latestDoc.ocr_data} />
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Sube documentos (vida laboral, bases, nóminas, resoluciones…) para generar tu
            expediente automáticamente.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Archivos subidos ({documents.length})</CardTitle>
            <p className="text-sm text-muted-foreground font-normal mt-1">
              Solo gestión: subir, releer o borrar. Los datos leídos están arriba en el expediente.
            </p>
          </div>
          <Link href="/upload">
            <Button size="sm">Subir más</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <DocumentList documents={documents} />
        </CardContent>
      </Card>
    </div>
  );
}

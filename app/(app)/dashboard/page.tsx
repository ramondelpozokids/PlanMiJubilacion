import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient, getProfile } from '@/lib/supabase/server';
import Link from 'next/link';
import { loadExpediente } from '@/lib/expediente/repository';
import { expedienteDataStats } from '@/lib/calculator/from-expediente';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { formatCurrency } from '@/lib/utils';
import { buildRetirementOutlook } from '@/lib/calculator/retirement-outlook';

export const metadata = { title: 'Dashboard', robots: { index: false } };

export default async function DashboardPage() {
  const profile = await getProfile();
  const supabase = await createClient();

  const [{ data: documentsData }, expediente, { count: docCount }] = await Promise.all([
    supabase
      .from('documents')
      .select('id, name, document_type, ocr_status')
      .eq('user_id', profile!.id),
    loadExpediente(profile!.id),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('user_id', profile!.id),
  ]);

  const exp = expediente as ExpedienteDigital | null;
  const stats = exp ? expedienteDataStats(exp) : null;
  const baseActual = exp?.resumen.baseMensualActual?.value;
  const hasBasesDoc = (documentsData ?? []).some(
    (d) =>
      d.document_type === 'bases_cotizacion' ||
      d.document_type === 'bases' ||
      /bases/i.test(d.name ?? '')
  );
  const basesMissingDespiteDoc =
    hasBasesDoc && (stats?.basesDocumentadas ?? 0) === 0;
  const outlook = exp ? buildRetirementOutlook(exp) : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Hola,{' '}
          {exp?.identificacion.nombre?.value?.split(' ')[0] ??
            profile?.full_name?.split(' ')[0] ??
            'usuario'}
        </h1>
        <p className="text-muted-foreground mt-2">
          Expediente documental · {exp?.completitud.score ?? 0}% completitud · {docCount ?? 0}{' '}
          documento(s)
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Actualiza de vez en cuando vida laboral + bases para mantenerlo en el presente real.
        </p>
      </header>

      {outlook && (
        <Card className="border-2 border-foreground/15">
          <CardHeader>
            <CardTitle className="text-base">Jubilación (cálculo)</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Ordinaria</p>
              <p className="text-xl font-semibold mt-1">{outlook.ordinary.dateLabel}</p>
              <p className="text-muted-foreground text-xs mt-1">{outlook.ordinary.ageLabel}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Si anticipas a los 63</p>
              <p className="text-xl font-semibold mt-1 text-warning">
                {outlook.earlyVoluntary.scenarios[0]
                  ? `−${outlook.earlyVoluntary.scenarios[0].reductionPercent}%`
                  : '—'}
              </p>
              <p className="text-muted-foreground text-xs mt-1">coeficientes reductores</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pensión est. ordinaria</p>
              <p className="text-xl font-semibold mt-1">
                {outlook.pension.ordinaryResult
                  ? formatCurrency(outlook.pension.ordinaryResult.monthlyPension)
                  : '—'}
              </p>
              <Link href="/analysis" className="text-xs text-accent underline mt-1 inline-block">
                Ver detalle completo
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Años cotizados (documentados)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {exp?.resumen.anosCotizados?.value ?? '—'}
            </div>
            {exp?.resumen.mesesCotizados?.value != null && (
              <p className="text-sm text-muted-foreground mt-1">
                + {exp.resumen.mesesCotizados.value} meses
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bases documentadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats?.basesDocumentadas ?? 0}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats?.primeraBase && stats?.ultimaBase
                ? `${stats.primeraBase} → ${stats.ultimaBase}`
                : basesMissingDespiteDoc
                  ? 'PDF de bases subido, pero sin meses extraídos'
                  : 'Sin bases aún'}
            </p>
            {basesMissingDespiteDoc && (
              <p className="text-xs text-warning mt-2">
                Ve a Análisis → Releer el informe de bases (usa http://localhost:3000).
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Última base conocida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {baseActual != null ? formatCurrency(baseActual) : '—'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Solo dato real del documento — no extrapolada
            </p>
          </CardContent>
        </Card>
      </div>

      {exp?.advisor && (
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="text-base">Resumen documental IA</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>{exp.advisor.summary}</p>
            {exp.advisor.risks.length > 0 && (
              <div>
                <p className="font-medium text-warning">Alertas documentales</p>
                <ul className="list-disc pl-5 mt-1">
                  {exp.advisor.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {exp.advisor.opportunities.length > 0 && (
              <div>
                <p className="font-medium">Siguiente paso</p>
                <ul className="list-disc pl-5 mt-1">
                  {exp.advisor.opportunities.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(exp?.pendingQuestions?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solo necesitamos esto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {exp!.pendingQuestions!.map((q) => (
              <div key={q.id} className="border-b border-border/40 pb-2">
                <p>{q.question}</p>
                <p className="text-xs text-muted-foreground">{q.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-accent/30">
        <CardHeader>
          <CardTitle>Tu información está en el expediente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Periodos, bases, paro, certificados y discrepancias — todo fusionado. No abras PDF a
            PDF: entra al expediente.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/analysis">
              <Button>Ver todo el expediente</Button>
            </Link>
            <Link href="/upload">
              <Button variant="secondary">Subir documentos</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

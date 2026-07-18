import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient, getProfile } from '@/lib/supabase/server';
import Link from 'next/link';
import { loadExpediente } from '@/lib/expediente/repository';
import { expedienteDataStats } from '@/lib/calculator/from-expediente';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { formatCurrency } from '@/lib/utils';
import { buildRetirementOutlook } from '@/lib/calculator/retirement-outlook';
import { FOUNDER_LIFE_PATH } from '@/lib/calculator/life-path';
import { PlanMiSuite } from '@/components/features/planmi-suite';
import { ReportToolbar } from '@/components/features/print-button';
import { DashboardToolsStrip } from '@/components/features/dashboard-tools-strip';
import { ScopeBadge } from '@/components/features/scope-badge';
import { PLANMI_BRAND } from '@/lib/planmi/products';
import { hasUnlimitedAccess } from '@/lib/admin/access';
import { resolveDisplayName } from '@/lib/admin/config';
import { listActivePricing } from '@/lib/billing/repository';
import { PricingTable } from '@/components/features/pricing-table';

export const metadata = { title: 'Inicio', robots: { index: false } };

export default async function DashboardPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const isFounder = hasUnlimitedAccess(profile);

  const [{ data: documentsData }, expediente, { count: docCount }, pricing] = await Promise.all([
    supabase
      .from('documents')
      .select('id, name, document_type, ocr_status')
      .eq('user_id', profile!.id),
    loadExpediente(profile!.id),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('user_id', profile!.id),
    listActivePricing(),
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
  const basesMissingDespiteDoc = hasBasesDoc && (stats?.basesDocumentadas ?? 0) === 0;
  const outlook = exp ? buildRetirementOutlook(exp, new Date(), FOUNDER_LIFE_PATH) : null;
  const displayName = resolveDisplayName({
    email: profile?.email,
    fullName: profile?.full_name,
    fallback: 'usuario',
  });

  const suiteMetrics = {
    jubilacion: {
      primary: outlook?.pension.ordinaryResult
        ? formatCurrency(outlook.pension.ordinaryResult.monthlyPension)
        : '—',
      secondary: outlook
        ? `Ordinaria ${outlook.ordinary.dateLabel}`
        : 'Sube vida laboral + bases',
    },
    prestaciones: {
      primary: String(exp?.prestaciones.length ?? 0),
      secondary: `${exp?.resoluciones.length ?? 0} certificados / resoluciones`,
    },
    'vida-laboral': {
      primary:
        exp?.resumen.anosCotizados?.value != null
          ? `${exp.resumen.anosCotizados.value} años`
          : '—',
      secondary:
        stats?.basesDocumentadas != null
          ? `${stats.basesDocumentadas} meses · ${formatCurrency(stats.sumaBasesDocumentadas)}`
          : 'Sin historial aún',
    },
    futuro: {
      primary: 'MIOP',
      secondary: 'Optimización de pensión y escenario vital',
    },
  };

  return (
    <div className="space-y-8 print-root max-w-7xl">
      <div className="space-y-2">
        <ScopeBadge scope="personal" />
        <ReportToolbar
          title={`Hola, ${displayName}`}
          subtitle={`PlanMiFuturo · tu plan personal · expediente ${exp?.completitud.score ?? 0}% · ${docCount ?? 0} documento(s)`}
        />
      </div>

      <DashboardToolsStrip isFounder={isFounder} />

      <PricingTable pricing={pricing} className="print:hidden" />

      {isFounder && (
        <section className="rounded-xl border border-dashed p-4 print:hidden">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
            Amigos y familiares (aparte)
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Si subes PDFs de Carlos u otro familiar, créales una consulta aquí. No van en Mi plan.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/asesoria/consultas">
              <Button size="sm" variant="secondary">
                Abrir consultas
              </Button>
            </Link>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/10 via-background to-success/5 p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/20 blur-3xl motion-reduce:hidden"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-success/15 blur-3xl motion-reduce:hidden"
          aria-hidden
        />
        <div className="relative max-w-2xl space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {PLANMI_BRAND}
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">PlanMiFuturo</h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Cuatro productos sobre el mismo expediente digital: jubilación, prestaciones, vida
            laboral y visión integral. Elige por dónde seguir.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 print:hidden">
            <Link href="/analysis">
              <Button size="sm">Ver expediente</Button>
            </Link>
            <Link href="/upload">
              <Button size="sm" variant="secondary">
                Subir documentos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Tus productos</h2>
          <p className="text-xs text-muted-foreground print:hidden">Actualiza vida laboral + bases</p>
        </div>
        <PlanMiSuite metrics={suiteMetrics} />
      </section>

      {outlook && (
        <Card className="border-foreground/15">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Snapshot jubilación</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground">Ordinaria</p>
              <p className="mt-1 text-xl font-semibold">{outlook.ordinary.dateLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">{outlook.ordinary.ageLabel}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Si anticipas a los 63</p>
              <p className="mt-1 text-xl font-semibold text-warning">
                {outlook.earlyVoluntary.scenarios[0]
                  ? `−${outlook.earlyVoluntary.scenarios[0].reductionPercent}%`
                  : '—'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">coeficientes reductores</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pensión est. ordinaria</p>
              <p className="mt-1 text-xl font-semibold">
                {outlook.pension.ordinaryResult
                  ? formatCurrency(outlook.pension.ordinaryResult.monthlyPension)
                  : '—'}
              </p>
              <Link
                href="/jubilacion"
                className="mt-1 inline-block text-xs text-accent underline print:hidden"
              >
                Abrir PlanMiJubilacion
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Años cotizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {exp?.resumen.anosCotizados?.value ?? '—'}
            </div>
            {exp?.resumen.mesesCotizados?.value != null && (
              <p className="mt-1 text-sm text-muted-foreground">
                + {exp.resumen.mesesCotizados.value} meses
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Suma de bases documentadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {stats && stats.basesDocumentadas > 0
                ? formatCurrency(stats.sumaBasesDocumentadas)
                : '—'}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats?.basesDocumentadas
                ? `${stats.basesDocumentadas} meses` +
                  (stats.primeraBase && stats.ultimaBase
                    ? ` · ${stats.primeraBase} → ${stats.ultimaBase}`
                    : '') +
                  (stats.mediaBasesDocumentadas != null
                    ? ` · media ${formatCurrency(stats.mediaBasesDocumentadas)}`
                    : '')
                : basesMissingDespiteDoc
                  ? 'PDF de bases subido, sin meses extraídos'
                  : 'Sin bases aún'}
            </p>
            {basesMissingDespiteDoc && (
              <p className="mt-2 text-xs text-warning">
                En Documentos → Releer el informe de bases.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Última base conocida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {baseActual != null ? formatCurrency(baseActual) : '—'}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Dato real del documento</p>
          </CardContent>
        </Card>
      </div>

      {exp?.advisor && (
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="text-base">Resumen documental IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{exp.advisor.summary}</p>
            {exp.advisor.risks.length > 0 && (
              <div>
                <p className="font-medium text-warning">Alertas documentales</p>
                <ul className="mt-1 list-disc pl-5">
                  {exp.advisor.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {exp.advisor.opportunities.length > 0 && (
              <div>
                <p className="font-medium">Siguiente paso</p>
                <ul className="mt-1 list-disc pl-5">
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

      <p className="print-footer">
        PlanMiFuturo · Dashboard · {displayName} · {new Date().toLocaleString('es-ES')}
      </p>
    </div>
  );
}

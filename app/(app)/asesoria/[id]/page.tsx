import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getProfile } from '@/lib/supabase/server';
import { hasUnlimitedAccess } from '@/lib/admin/access';
import { getConsultationCase } from '@/lib/consultation/repository';
import { buildRetirementOutlook } from '@/lib/calculator/retirement-outlook';
import { isSubsidio52Active } from '@/lib/calculator/life-path';
import { runMiop } from '@/lib/optimization/run';
import { buildRetirementCalendar } from '@/lib/consultation/retirement-calendar';
import { buildConsultationSummary } from '@/lib/consultation/client-summary';
import { evaluateInternationalCoordination } from '@/lib/international-coordination/evaluate';
import { buildCombinedPensionSummary } from '@/lib/international-coordination/combined';
import { PrintButton } from '@/components/features/print-button';
import { ConsultationLifePathForm } from '@/components/features/consultation-life-path-form';
import { ConsultationManager } from '@/components/features/consultation-manager';
import { InternationalCotizacionesWizard } from '@/components/features/international-cotizaciones-wizard';
import { InternationalCotizacionesReport } from '@/components/features/international-cotizaciones-report';
import { CombinedInternationalPensionCard } from '@/components/features/combined-international-pension-card';
import { RetirementOutlookCard } from '@/components/features/retirement-outlook-card';
import { Subsidio52Card } from '@/components/features/subsidio-52-card';
import { ExpedienteSections } from '@/components/features/expediente-sections';
import { ConsultationRetirementCalendar } from '@/components/features/consultation-retirement-calendar';
import { ConsultationDateSimulation } from '@/components/features/consultation-date-simulation';
import { ConsultationMiopPodium } from '@/components/features/consultation-miop-podium';
import { ConsultationClientReport } from '@/components/features/consultation-client-report';
import { ConsultationCaseEditor } from '@/components/features/consultation-case-editor';
import { listConsultationCases } from '@/lib/consultation/repository';
import { ScopeBadge } from '@/components/features/scope-badge';
import { buildClientDossierReport } from '@/lib/reports/build-client-dossier-report';
import { ClientDossierPrintReport } from '@/components/features/client-dossier-print-report';
import { listDocumentsForScope } from '@/lib/documents/list-for-scope';
import { format } from 'date-fns';
import { resolveExpedienteAsOf } from '@/lib/expediente/as-of';

export const metadata = { title: 'Consulta de cliente', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AsesoriaCasePage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await getProfile();
  if (!profile || !hasUnlimitedAccess(profile)) redirect('/dashboard');

  const c = await getConsultationCase(params.id, profile.id);
  if (!c) notFound();

  const hasDocs = c.expediente.documentIds.length > 0;
  const asOf = resolveExpedienteAsOf(c.expediente);
  const outlook = hasDocs ? buildRetirementOutlook(c.expediente, asOf, c.lifePath) : null;
  const miop = hasDocs ? runMiop(c.expediente, asOf, 'standard', c.lifePath) : null;
  const calendar = outlook ? buildRetirementCalendar(outlook, c.lifePath, asOf) : [];
  const intl = evaluateInternationalCoordination(c.expediente.internationalCotizaciones);
  const spainMonthly = outlook?.pension.ordinaryResult?.monthlyPension ?? null;
  const combined = buildCombinedPensionSummary({
    spainMonthly,
    spainLabel: `Pensión España de ${c.clientName} (estimación)`,
    coordination: intl,
  });

  const summaryLines =
    outlook &&
    buildConsultationSummary({
      clientName: c.clientName,
      outlook,
      lifePath: c.lifePath,
      miop,
      internationalCotizaciones: c.expediente.internationalCotizaciones,
    });

  const caseDocuments = await listDocumentsForScope({
    userId: profile.id,
    consultationCaseId: c.id,
  });

  const dossierReport = buildClientDossierReport(c.expediente, {
    clientName: c.clientName,
    lifePath: c.lifePath,
    variant: 'consultation',
    documents: caseDocuments,
    summaryLines: summaryLines || undefined,
  });

  const allCases = await listConsultationCases(profile.id);

  return (
    <div className="space-y-8 print-root max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <ScopeBadge scope="consultation" clientName={c.clientName} />
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{c.clientName}</h1>
          {c.clientNote && (
            <p className="mt-2 text-sm text-muted-foreground">{c.clientNote}</p>
          )}
          <p className="mt-2 rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground max-w-xl">
            Expediente del cliente. No es tu plan personal (Mi plan → Jubilación).
          </p>
          <div className="mt-3">
            <ConsultationCaseEditor
              compact
              caseMeta={{
                id: c.id,
                clientName: c.clientName,
                clientNote: c.clientNote,
                clientBirthDate: c.clientBirthDate,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Expediente {c.completitudScore}% · actualizado{' '}
            {new Date(c.updatedAt).toLocaleString('es-ES')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintButton label="Imprimir informe PDF" variant="primary" />
          <Link href="/asesoria/consultas">
            <Button size="sm" variant="secondary">
              Volver a consultas
            </Button>
          </Link>
          <Link href="/jubilacion">
            <Button size="sm" variant="ghost">
              Mi plan
            </Button>
          </Link>
        </div>
      </div>

      <div className="print:hidden space-y-8">
        <ConsultationLifePathForm caseId={c.id} lifePath={c.lifePath} />

        <InternationalCotizacionesWizard
          caseId={c.id}
          initial={c.expediente.internationalCotizaciones ?? null}
        />

        <div>
          <ConsultationManager
            cases={allCases.map((x) => ({
              id: x.id,
              clientName: x.clientName,
              clientNote: x.clientNote,
              clientBirthDate: x.clientBirthDate,
            }))}
            uploadOnly
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Tip: para la carta alemana (u otro país) elija el tipo «Pensión / carta extranjera» al
            subir el PDF, e introduzca el importe en el asistente de arriba.
          </p>
        </div>
      </div>

      {!hasDocs && !intl && caseDocuments.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground print:hidden">
          Sube vida laboral, bases, simulación o nómina, y completa el apartado internacional si
          ha cotizado fuera de España.
        </p>
      ) : (
        <>
          {dossierReport && <ClientDossierPrintReport report={dossierReport} />}

          <div className="print:hidden space-y-8">
            {summaryLines && (
              <ConsultationClientReport clientName={c.clientName} lines={summaryLines} />
            )}

            {combined && (
              <CombinedInternationalPensionCard summary={combined} clientName={c.clientName} />
            )}

            {intl && <InternationalCotizacionesReport result={intl} />}

            {outlook && (
              <>
                <RetirementOutlookCard
                  outlook={outlook}
                  variant="consultation"
                  clientName={c.clientName}
                />
                {isSubsidio52Active(c.lifePath) && (
                  <Subsidio52Card outlook={outlook} variant="consultation" />
                )}
                <ConsultationDateSimulation
                  expediente={c.expediente}
                  lifePath={c.lifePath}
                  clientName={c.clientName}
                  defaultDateIso={format(outlook.ordinary.date, 'yyyy-MM-dd')}
                />
                <ConsultationRetirementCalendar
                  milestones={calendar}
                  clientName={c.clientName}
                />
              </>
            )}

            {miop && <ConsultationMiopPodium miop={miop} />}

            {hasDocs && (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Expediente documental (pantalla)</h2>
                <ExpedienteSections expediente={c.expediente} outlook={null} />
              </section>
            )}
          </div>
        </>
      )}

      <p className="print-footer">
        PlanMiJubilacion · Asesoría · {c.clientName} · {new Date().toLocaleString('es-ES')}
      </p>
    </div>
  );
}

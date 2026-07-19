import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getProfile } from '@/lib/supabase/server';
import { loadExpediente } from '@/lib/expediente/repository';
import { buildRetirementOutlook } from '@/lib/calculator/retirement-outlook';
import { evaluateInternationalCoordination } from '@/lib/international-coordination/evaluate';
import { getPricingRule } from '@/lib/billing/repository';
import { getPlanMiProduct } from '@/lib/planmi/products';
import { ProductPageHeader, EmptyProductState } from '@/components/features/planmi-suite';
import { PrintButton } from '@/components/features/print-button';
import { RetirementOutlookCard } from '@/components/features/retirement-outlook-card';
import { Subsidio52Card } from '@/components/features/subsidio-52-card';
import { InternationalCotizacionesWizard } from '@/components/features/international-cotizaciones-wizard';
import { InternationalCotizacionesReport } from '@/components/features/international-cotizaciones-report';
import { CombinedInternationalPensionCard } from '@/components/features/combined-international-pension-card';
import { InternationalReviewOffer } from '@/components/features/international-review-offer';
import { buildCombinedPensionSummary } from '@/lib/international-coordination/combined';
import { ScopeBadge } from '@/components/features/scope-badge';
import { FOUNDER_LIFE_PATH } from '@/lib/calculator/life-path';
import { FOUNDER_DISPLAY_NAME } from '@/lib/admin/config';
import { buildClientDossierReport } from '@/lib/reports/build-client-dossier-report';
import { ClientDossierPrintReport } from '@/components/features/client-dossier-print-report';
import { listDocumentsForScope } from '@/lib/documents/list-for-scope';
import { resolveExpedienteAsOf } from '@/lib/expediente/as-of';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const metadata = { title: 'PlanMiJubilacion', robots: { index: false } };

export default async function JubilacionPage() {
  const product = getPlanMiProduct('jubilacion');
  const profile = await getProfile();
  const expediente = await loadExpediente(profile!.id);
  const asOf = expediente ? resolveExpedienteAsOf(expediente) : new Date();
  const outlook = expediente
    ? buildRetirementOutlook(expediente, asOf, FOUNDER_LIFE_PATH)
    : null;
  const intlResult = evaluateInternationalCoordination(expediente?.internationalCotizaciones);
  const spainMonthly = outlook?.pension.ordinaryResult?.monthlyPension ?? null;
  const combined = buildCombinedPensionSummary({
    spainMonthly,
    coordination: intlResult,
  });
  const intlPricing = await getPricingRule('revision_internacional');
  const personalDocs = await listDocumentsForScope({
    userId: profile!.id,
    consultationCaseId: null,
  });
  const dossierReport = expediente
    ? buildClientDossierReport(expediente, {
        clientName: FOUNDER_DISPLAY_NAME,
        lifePath: FOUNDER_LIFE_PATH,
        variant: 'self',
        documents: personalDocs,
        commercial: {
          serviceLabel: 'Informe personal de jubilación (Mi plan)',
          priceCents: null,
          priceLabel: 'Uso personal · sin cobro',
          deliveredAtLabel: format(asOf, "d 'de' MMMM 'de' yyyy", { locale: es }),
        },
      })
    : null;

  return (
    <div className="space-y-6 print-root max-w-7xl">
      <div className="print:hidden space-y-2">
        <ScopeBadge scope="personal" />
        <ProductPageHeader
          name={product.name}
          tagline={product.tagline}
          actions={
            <>
              <PrintButton label="Imprimir informe PDF" variant="primary" />
              <Link href="/analysis">
                <Button size="sm" variant="secondary">
                  Expediente
                </Button>
              </Link>
              <Link href="/miop">
                <Button size="sm" variant="secondary">
                  MIOP
                </Button>
              </Link>
              <Link href="/comparator">
                <Button size="sm">Simulador</Button>
              </Link>
            </>
          }
        />
      </div>
      <div className="print:hidden">
        <InternationalCotizacionesWizard initial={expediente?.internationalCotizaciones ?? null} />
      </div>

      {!expediente || expediente.documentIds.length === 0 ? (
        <div className="print:hidden">
          <EmptyProductState
            title="Sin expediente aún"
            description="Sube vida laboral e informe de bases para calcular fechas y pensión orientativa."
          />
        </div>
      ) : !outlook ? (
        <div className="print:hidden">
          <EmptyProductState
            title="Faltan datos de jubilación"
            description="Revisa identificación (fecha de nacimiento) y bases en el expediente."
            href="/analysis"
            cta="Ver expediente"
          />
        </div>
      ) : (
        <>
          {dossierReport && <ClientDossierPrintReport report={dossierReport} />}

          <div className="print:hidden space-y-6">
            {intlResult?.spanishEstimateMayBeIncomplete && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
                Tiene cotizaciones en el extranjero: la pensión española mostrada abajo puede ser{' '}
                <strong>incompleta</strong> como estimación global.
              </div>
            )}
            <RetirementOutlookCard outlook={outlook} />
            <Subsidio52Card outlook={outlook} />
          </div>
        </>
      )}

      <div className="print:hidden space-y-6">
        {combined && <CombinedInternationalPensionCard summary={combined} />}
        {intlResult && <InternationalCotizacionesReport result={intlResult} />}
        <InternationalReviewOffer pricing={intlPricing} hasInternational={Boolean(intlResult)} />
      </div>

      <p className="print-footer">
        {product.name} · {new Date().toLocaleString('es-ES')}
      </p>
    </div>
  );
}

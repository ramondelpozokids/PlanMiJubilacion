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



export const metadata = { title: 'PlanMiJubilacion', robots: { index: false } };



export default async function JubilacionPage() {

  const product = getPlanMiProduct('jubilacion');

  const profile = await getProfile();

  const expediente = await loadExpediente(profile!.id);

  const outlook = expediente ? buildRetirementOutlook(expediente) : null;

  const intlResult = evaluateInternationalCoordination(expediente?.internationalCotizaciones);

  const spainMonthly = outlook?.pension.ordinaryResult?.monthlyPension ?? null;

  const combined = buildCombinedPensionSummary({
    spainMonthly,
    coordination: intlResult,
  });

  const intlPricing = await getPricingRule('revision_internacional');



  return (

    <div className="space-y-6 print-root max-w-7xl">

      <ProductPageHeader

        name={product.name}

        tagline={product.tagline}

        actions={

          <>

            <PrintButton label="Imprimir" />

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



      <InternationalCotizacionesWizard initial={expediente?.internationalCotizaciones ?? null} />



      {!expediente || expediente.documentIds.length === 0 ? (

        <EmptyProductState

          title="Sin expediente aún"

          description="Sube vida laboral e informe de bases para calcular fechas y pensión orientativa."

        />

      ) : !outlook ? (

        <EmptyProductState

          title="Faltan datos de jubilación"

          description="Revisa identificación (fecha de nacimiento) y bases en el expediente."

          href="/analysis"

          cta="Ver expediente"

        />

      ) : (

        <>

          {intlResult?.spanishEstimateMayBeIncomplete && (

            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">

              Tiene cotizaciones en el extranjero: la pensión española mostrada abajo puede ser{' '}

              <strong>incompleta</strong> como estimación global.

            </div>

          )}

          <RetirementOutlookCard outlook={outlook} />

          <Subsidio52Card outlook={outlook} />

        </>

      )}



      {combined && <CombinedInternationalPensionCard summary={combined} />}

      {intlResult && <InternationalCotizacionesReport result={intlResult} />}

      <InternationalReviewOffer pricing={intlPricing} hasInternational={Boolean(intlResult)} />



      <p className="print-footer">

        {product.name} · {new Date().toLocaleString('es-ES')}

      </p>

    </div>

  );

}



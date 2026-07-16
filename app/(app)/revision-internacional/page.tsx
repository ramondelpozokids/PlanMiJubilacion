import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getProfile } from '@/lib/supabase/server';
import { loadExpediente } from '@/lib/expediente/repository';
import { evaluateInternationalCoordination } from '@/lib/international-coordination/evaluate';
import { getPricingRule } from '@/lib/billing/repository';
import { formatPriceEur } from '@/lib/billing/pricing';
import { InternationalCotizacionesReport } from '@/components/features/international-cotizaciones-report';
import { ProductPageHeader } from '@/components/features/planmi-suite';

export const metadata = {
  title: 'Revisión internacional de jubilación',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

export default async function RevisionInternacionalPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const expediente = await loadExpediente(profile.id);
  const intl = expediente?.internationalCotizaciones ?? null;
  const evaluation = evaluateInternationalCoordination(intl);
  const pricing = await getPricingRule('revision_internacional');

  if (!evaluation) {
    return (
      <div className="space-y-6 max-w-3xl">
        <ProductPageHeader
          name="Revisión internacional"
          tagline="Solo para expedientes con cotizaciones en el extranjero"
        />
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Primero complete el asistente de cotizaciones internacionales en{' '}
          <Link href="/jubilacion" className="underline">
            PlanMiJubilación
          </Link>
          {' '}
          (responda «Sí», elija países y pulse <strong>Guardar y ver resumen</strong>).
          Luego vuelva a esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <ProductPageHeader
        name="Revisión internacional de jubilación"
        tagline="Análisis multi-país · sin estimar pensiones extranjeras"
        actions={
          <Link href="/informes">
            <Button size="sm" variant="secondary">
              Mis informes y pagos
            </Button>
          </Link>
        }
      />

      <div className="rounded-xl border p-5 space-y-2">
        <p className="text-sm text-muted-foreground">Tarifa orientativa (configurable)</p>
        <p className="text-3xl font-semibold tabular-nums">{formatPriceEur(pricing.priceCents)}</p>
        <p className="text-sm">{pricing.description}</p>
        <ul className="mt-4 list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Mapa de países y marco legal aplicable</li>
          <li>Totalización y posible derecho a varias pensiones</li>
          <li>Checklist documental y recomendaciones de trámite</li>
          <li>Informe PDF con portada profesional (próximamente tras pago)</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-4">
          Los fundadores pueden marcar consultas como gratuitas o precio reducido desde configuración
          en Supabase (`pricing_rules.discount_mode` o overrides por usuario).
        </p>
      </div>

      <InternationalCotizacionesReport result={evaluation} />
    </div>
  );
}

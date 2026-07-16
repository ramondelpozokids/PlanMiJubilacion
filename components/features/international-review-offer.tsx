import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatPriceEur } from '@/lib/billing/pricing';
import type { PricingRule } from '@/lib/international-coordination/types';

export function InternationalReviewOffer({
  pricing,
  hasInternational,
}: {
  pricing: PricingRule;
  hasInternational: boolean;
}) {
  if (!hasInternational) return null;

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
      <h3 className="font-semibold">Revisión internacional de jubilación</h3>
      <p className="text-sm text-muted-foreground">
        Estudio exclusivo para cotizaciones en varios países: coordinación aplicable, documentación
        recomendada y pasos de solicitud. Sin estimar importes extranjeros no oficiales.
      </p>
      <p className="text-2xl font-semibold tabular-nums">{formatPriceEur(pricing.priceCents)}</p>
      <Link href="/revision-internacional">
        <Button size="sm">Solicitar revisión</Button>
      </Link>
    </section>
  );
}

/**
 * Precios por defecto (sobrescribibles vía tabla pricing_rules en Supabase).
 * Valores en céntimos EUR, IVA incluido en precio mostrado al usuario.
 */
import type { DiscountMode, PricingRule, ServiceKey } from '@/lib/international-coordination/types';

export const DEFAULT_PRICING: PricingRule[] = [
  {
    serviceKey: 'informe_estandar',
    label: 'Informe estándar',
    description: 'Informe personalizado de planificación de jubilación (nacional).',
    priceCents: 2990,
    currency: 'eur',
    discountMode: 'full',
    active: true,
  },
  {
    serviceKey: 'informe_internacional',
    label: 'Informe internacional',
    description: 'Análisis con cotizaciones en varios países y coordinación aplicable.',
    priceCents: 4990,
    currency: 'eur',
    discountMode: 'full',
    active: true,
  },
  {
    serviceKey: 'informe_premium',
    label: 'Informe premium',
    description:
      'Simulaciones múltiples, escenarios de edad, convenios y recomendaciones ampliadas.',
    priceCents: 7990,
    currency: 'eur',
    discountMode: 'full',
    active: true,
  },
  {
    serviceKey: 'revision_internacional',
    label: 'Revisión internacional de jubilación',
    description:
      'Estudio exclusivo para usuarios con cotizaciones en varios países y revisión documental.',
    priceCents: 4990,
    currency: 'eur',
    discountMode: 'full',
    active: true,
  },
];

export function getDefaultPricing(serviceKey: ServiceKey): PricingRule | undefined {
  return DEFAULT_PRICING.find((p) => p.serviceKey === serviceKey && p.active);
}

/** Aplica descuento según modo (configurable por campaña/usuario). */
export function applyDiscount(priceCents: number, mode: DiscountMode): number {
  switch (mode) {
    case 'free':
      return 0;
    case 'reduced':
      return Math.round(priceCents * 0.5);
    case 'full':
    default:
      return priceCents;
  }
}

export function formatPriceEur(cents: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

/** Desglose IVA 21% incluido (precio con IVA → base + cuota). */
export function splitVatIncluded(totalCents: number, rate = 0.21): {
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
} {
  const subtotalCents = Math.round(totalCents / (1 + rate));
  const vatCents = totalCents - subtotalCents;
  return { subtotalCents, vatCents, totalCents };
}

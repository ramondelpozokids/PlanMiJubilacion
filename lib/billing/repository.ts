/**
 * Repositorio de precios y documentos de facturación.
 */
import { createClient } from '@/lib/supabase/server';
import {
  applyDiscount,
  DEFAULT_PRICING,
  getDefaultPricing,
} from '@/lib/billing/pricing';
import type { DiscountMode, PricingRule, ServiceKey } from '@/lib/international-coordination/types';

export async function getPricingRule(serviceKey: ServiceKey): Promise<PricingRule> {
  const fallback = getDefaultPricing(serviceKey);
  if (!fallback) throw new Error(`Servicio desconocido: ${serviceKey}`);

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('service_key', serviceKey)
      .eq('active', true)
      .maybeSingle();

    if (!data) return fallback;

    return {
      serviceKey: data.service_key as ServiceKey,
      label: data.label,
      description: data.description ?? '',
      priceCents: data.price_cents,
      currency: 'eur',
      discountMode: (data.discount_mode as DiscountMode) ?? 'full',
      active: data.active,
    };
  } catch {
    return fallback;
  }
}

export async function listActivePricing(): Promise<PricingRule[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('active', true)
      .order('price_cents');

    if (!data?.length) return DEFAULT_PRICING.filter((p) => p.active);

    return data.map((row) => ({
      serviceKey: row.service_key as ServiceKey,
      label: row.label,
      description: row.description ?? '',
      priceCents: row.price_cents,
      currency: 'eur' as const,
      discountMode: (row.discount_mode as DiscountMode) ?? 'full',
      active: row.active,
    }));
  } catch {
    return DEFAULT_PRICING.filter((p) => p.active);
  }
}

export function resolvePrice(
  rule: PricingRule,
  overrideMode?: DiscountMode
): { finalCents: number; mode: DiscountMode } {
  const mode = overrideMode ?? rule.discountMode;
  return { finalCents: applyDiscount(rule.priceCents, mode), mode };
}

export interface BillingDocumentRow {
  id: string;
  docType: string;
  docNumber: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export async function listUserBillingDocuments(userId: string): Promise<BillingDocumentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('billing_documents')
    .select('id, doc_type, doc_number, payload, created_at, html_snapshot')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    docType: r.doc_type,
    docNumber: r.doc_number,
    payload: r.payload as Record<string, unknown>,
    createdAt: r.created_at ?? '',
  }));
}

'use server';

import { revalidatePath } from 'next/cache';
import { getProfile } from '@/lib/supabase/server';
import { hasUnlimitedAccess } from '@/lib/admin/access';
import { issueBillingDocuments } from '@/lib/billing/issue';
import { deleteUserBillingDocuments } from '@/lib/billing/repository';
import type { DiscountMode, ServiceKey } from '@/lib/international-coordination/types';

const SERVICE_KEYS: ServiceKey[] = [
  'informe_estandar',
  'informe_internacional',
  'informe_premium',
  'revision_internacional',
];

export async function issueDocumentsAction(formData: FormData) {
  const profile = await getProfile();
  if (!profile) throw new Error('No autenticado');

  const serviceKey = String(formData.get('serviceKey') ?? '') as ServiceKey;
  if (!SERVICE_KEYS.includes(serviceKey)) {
    throw new Error('Servicio no válido');
  }

  let discountMode = String(formData.get('discountMode') ?? 'full') as DiscountMode;
  if (!['free', 'reduced', 'full'].includes(discountMode)) {
    discountMode = 'full';
  }

  // Solo fundador puede emitir gratuito/reducido desde la UI
  if ((discountMode === 'free' || discountMode === 'reduced') && !hasUnlimitedAccess(profile)) {
    discountMode = 'full';
  }

  const clientName =
    String(formData.get('clientName') ?? '').trim() ||
    profile.full_name ||
    profile.email ||
    'Cliente';
  const clientEmail =
    String(formData.get('clientEmail') ?? '').trim() || profile.email || '';
  const clientTaxId = String(formData.get('clientTaxId') ?? '').trim() || undefined;
  const clientAddress = String(formData.get('clientAddress') ?? '').trim() || undefined;
  const notes = String(formData.get('notes') ?? '').trim() || undefined;

  if (!clientEmail) throw new Error('Falta el email del cliente');

  const result = await issueBillingDocuments({
    userId: profile.id,
    clientName,
    clientEmail,
    clientTaxId,
    clientAddress,
    serviceKey,
    discountMode,
    notes,
  });

  revalidatePath('/informes');
  return result;
}

export async function deleteBillingDocumentsAction(ids: string[]) {
  const profile = await getProfile();
  if (!profile) return { success: false as const, error: 'No autenticado' };

  try {
    const { deleted } = await deleteUserBillingDocuments(profile.id, ids);
    revalidatePath('/informes');
    return { success: true as const, deleted };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : 'No se pudieron borrar',
    };
  }
}

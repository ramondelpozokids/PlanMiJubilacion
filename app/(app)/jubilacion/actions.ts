'use server';

import { revalidatePath } from 'next/cache';
import { getProfile } from '@/lib/supabase/server';
import { loadExpediente, saveExpediente } from '@/lib/expediente/repository';
import { parseInternationalFromForm } from '@/lib/international-coordination/evaluate';

export async function saveInternationalCotizacionesAction(formData: FormData) {
  const profile = await getProfile();
  if (!profile) throw new Error('No autenticado');

  const expediente = await loadExpediente(profile.id);
  if (!expediente) throw new Error('Sin expediente');

  expediente.internationalCotizaciones = parseInternationalFromForm(formData);
  expediente.updatedAt = new Date().toISOString();
  await saveExpediente(expediente);

  revalidatePath('/jubilacion');
  revalidatePath('/analysis');
}

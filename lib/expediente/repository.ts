/**
 * Repositorio del expediente digital — persistencia en Supabase.
 */
import { createClient } from '@/lib/supabase/server';
import type { ExpedienteDigital } from './types';
import { emptyExpediente } from './types';

export async function loadExpediente(userId: string): Promise<ExpedienteDigital | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expedientes')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data?.data) return null;
  const exp = data.data as ExpedienteDigital;
  const { pruneExpedienteToToday } = await import('./merge');
  const before = exp.bases.length;
  pruneExpedienteToToday(exp);
  if (exp.bases.length !== before) {
    await saveExpediente(exp);
  }
  return exp;
}

export async function saveExpediente(expediente: ExpedienteDigital): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('expedientes').upsert(
    {
      user_id: expediente.userId,
      data: expediente,
      version: expediente.version,
      completitud_score: expediente.completitud.score,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) throw new Error(`No se pudo guardar el expediente: ${error.message}`);
}

export async function ensureExpediente(userId: string): Promise<ExpedienteDigital> {
  const existing = await loadExpediente(userId);
  if (existing) return existing;
  const fresh = emptyExpediente(userId);
  await saveExpediente(fresh);
  return fresh;
}

/**
 * @deprecated SIP Fase 1 — extracted_data ya no es fuente de verdad.
 * No escribe. Se elimina la tabla en Fase 2. Mantener firma por compatibilidad de imports.
 */
export async function syncExtractedDataSummary(
  _userId: string,
  _expediente: ExpedienteDigital,
  _lastSource?: string
): Promise<void> {
  // no-op: SoT = expedientes.data
}

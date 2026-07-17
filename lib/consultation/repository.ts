/**
 * Consultas de fundador — expedientes de terceros (asesoría gratuita).
 */
import { createClient } from '@/lib/supabase/server';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { emptyExpediente } from '@/lib/expediente/types';
import {
  DEFAULT_CONSULTATION_LIFE_PATH,
  parseLifePathJson,
  type LifePathAssumptions,
} from '@/lib/calculator/life-path';

export interface ConsultationCase {
  id: string;
  founderId: string;
  clientName: string;
  clientNote: string | null;
  /** ISO YYYY-MM-DD o null */
  clientBirthDate: string | null;
  expediente: ExpedienteDigital;
  lifePath: LifePathAssumptions;
  completitudScore: number;
  createdAt: string;
  updatedAt: string;
}

export type ConsultationCaseMeta = {
  id: string;
  clientName: string;
  clientNote: string | null;
  clientBirthDate: string | null;
};

function isoToDmy(iso: string | null | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function applyBirthToExpediente(
  expediente: ExpedienteDigital,
  birthIso: string | null
): ExpedienteDigital {
  const dmy = isoToDmy(birthIso);
  if (!dmy) return expediente;
  const existing = expediente.identificacion.fechaNacimiento;
  return {
    ...expediente,
    identificacion: {
      ...expediente.identificacion,
      fechaNacimiento: {
        value: dmy,
        sources:
          existing?.sources?.length
            ? existing.sources
            : [
                {
                  documentId: 'manual',
                  documentName: 'Datos de consulta (manual)',
                  documentType: 'otro' as const,
                  extractedAt: new Date().toISOString(),
                },
              ],
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

function rowToCase(row: {
  id: string;
  founder_id: string;
  client_name: string;
  client_note: string | null;
  client_birth_date?: string | null;
  expediente_data: unknown;
  life_path?: unknown;
  completitud_score: number;
  created_at: string;
  updated_at: string;
}): ConsultationCase {
  const data = row.expediente_data as ExpedienteDigital;
  const birth =
    typeof row.client_birth_date === 'string' && row.client_birth_date
      ? row.client_birth_date.slice(0, 10)
      : null;
  return {
    id: row.id,
    founderId: row.founder_id,
    clientName: row.client_name,
    clientNote: row.client_note,
    clientBirthDate: birth,
    expediente: data?.userId ? data : emptyExpediente(row.founder_id),
    lifePath: parseLifePathJson(row.life_path),
    completitudScore: row.completitud_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listConsultationCases(founderId: string): Promise<ConsultationCase[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('consultation_cases')
    .select('*')
    .eq('founder_id', founderId)
    .order('updated_at', { ascending: false });

  if (error) {
    if (error.message.includes('consultation_cases')) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map(rowToCase);
}

export async function getConsultationCase(
  caseId: string,
  founderId: string
): Promise<ConsultationCase | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('consultation_cases')
    .select('*')
    .eq('id', caseId)
    .eq('founder_id', founderId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToCase(data);
}

export async function createConsultationCase(
  founderId: string,
  clientName: string,
  options?: { clientNote?: string; clientBirthDate?: string | null }
): Promise<ConsultationCase> {
  const supabase = await createClient();
  const birth = options?.clientBirthDate?.trim() || null;
  let expediente = emptyExpediente(founderId);
  expediente = applyBirthToExpediente(expediente, birth);

  const { data, error } = await supabase
    .from('consultation_cases')
    .insert({
      founder_id: founderId,
      client_name: clientName.trim(),
      client_note: options?.clientNote?.trim() || null,
      client_birth_date: birth,
      expediente_data: expediente,
      life_path: DEFAULT_CONSULTATION_LIFE_PATH,
      completitud_score: expediente.completitud.score,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToCase(data);
}

export async function updateConsultationCase(
  caseId: string,
  founderId: string,
  patch: {
    clientName: string;
    clientNote?: string | null;
    clientBirthDate?: string | null;
  }
): Promise<ConsultationCase> {
  const existing = await getConsultationCase(caseId, founderId);
  if (!existing) throw new Error('Consulta no encontrada');

  const birth = patch.clientBirthDate?.trim() || null;
  const expediente = applyBirthToExpediente(existing.expediente, birth);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('consultation_cases')
    .update({
      client_name: patch.clientName.trim(),
      client_note: patch.clientNote?.trim() || null,
      client_birth_date: birth,
      expediente_data: expediente,
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseId)
    .eq('founder_id', founderId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToCase(data);
}

export async function deleteConsultationCase(
  caseId: string,
  founderId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('consultation_cases')
    .delete()
    .eq('id', caseId)
    .eq('founder_id', founderId);

  if (error) throw new Error(error.message);
}

export async function saveConsultationExpediente(
  caseId: string,
  founderId: string,
  expediente: ExpedienteDigital
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('consultation_cases')
    .update({
      expediente_data: expediente,
      completitud_score: expediente.completitud.score,
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseId)
    .eq('founder_id', founderId);

  if (error) throw new Error(error.message);
}

export async function saveConsultationLifePath(
  caseId: string,
  founderId: string,
  lifePath: LifePathAssumptions
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('consultation_cases')
    .update({
      life_path: lifePath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseId)
    .eq('founder_id', founderId);

  if (error) throw new Error(error.message);
}

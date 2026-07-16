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
  expediente: ExpedienteDigital;
  lifePath: LifePathAssumptions;
  completitudScore: number;
  createdAt: string;
  updatedAt: string;
}

function rowToCase(row: {
  id: string;
  founder_id: string;
  client_name: string;
  client_note: string | null;
  expediente_data: unknown;
  life_path?: unknown;
  completitud_score: number;
  created_at: string;
  updated_at: string;
}): ConsultationCase {
  const data = row.expediente_data as ExpedienteDigital;
  return {
    id: row.id,
    founderId: row.founder_id,
    clientName: row.client_name,
    clientNote: row.client_note,
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
  clientNote?: string
): Promise<ConsultationCase> {
  const supabase = await createClient();
  const expediente = emptyExpediente(founderId);
  const { data, error } = await supabase
    .from('consultation_cases')
    .insert({
      founder_id: founderId,
      client_name: clientName.trim(),
      client_note: clientNote?.trim() || null,
      expediente_data: expediente,
      life_path: DEFAULT_CONSULTATION_LIFE_PATH,
      completitud_score: 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToCase(data);
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

/**
 * Persistencia de escenarios.
 * System: se regeneran en cada recalculate.
 * Custom: se conservan.
 */
import { createClient } from '@/lib/supabase/server';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import {
  generateSystemScenarios,
  type SimulatedScenario,
} from './simulate';

function toRow(userId: string, s: SimulatedScenario) {
  return {
    user_id: userId,
    name: s.name,
    scenario_type: s.type,
    retirement_age: s.retirementAge,
    monthly_pension: s.result.monthlyPension,
    total_lifetime: s.totalLifetime,
    is_recommended: s.isRecommended,
    metadata: {
      origin: s.origin,
      notes: s.notes,
      quality: s.quality,
      monthsEarly: s.monthsEarly,
      reductionPercent: s.reductionPercent,
      convenioCost: s.convenioCost,
      baseReguladora: s.result.baseReguladora,
      percentageByYears: s.result.percentageByYears,
      disclaimer: s.result.disclaimer,
      retirementDate: s.retirementDate.toISOString(),
      assumptions: s.assumptions,
    },
  };
}

/** Regenera escenarios del sistema; no borra los custom. */
export async function persistScenariosFromExpediente(
  userId: string,
  expediente: ExpedienteDigital
): Promise<number> {
  const system = generateSystemScenarios(expediente);
  const supabase = await createClient();

  // Borrar solo system / legacy sin origin custom
  const { data: existing } = await supabase
    .from('scenarios')
    .select('id, metadata')
    .eq('user_id', userId);

  const toDelete = (existing ?? [])
    .filter((row) => {
      const origin = (row.metadata as { origin?: string } | null)?.origin;
      return origin !== 'custom';
    })
    .map((r) => r.id);

  if (toDelete.length > 0) {
    await supabase.from('scenarios').delete().in('id', toDelete);
  }

  if (system.length === 0) return 0;

  const { error } = await supabase.from('scenarios').insert(system.map((s) => toRow(userId, s)));
  if (error) throw new Error(`No se pudieron guardar escenarios: ${error.message}`);

  return system.length;
}

export async function saveCustomScenario(
  userId: string,
  scenario: SimulatedScenario
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scenarios')
    .insert(toRow(userId, { ...scenario, origin: 'custom', type: 'custom' }))
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteScenario(userId: string, scenarioId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('scenarios')
    .delete()
    .eq('id', scenarioId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function listScenarios(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scenarios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

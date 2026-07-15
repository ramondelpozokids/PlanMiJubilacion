import { createClient } from '@/lib/supabase/server';
import { loadExpediente } from '@/lib/expediente/repository';
import type { ExpedienteDigital } from '@/lib/expediente/types';

export async function getAdvisorContext(userId: string) {
  const supabase = await createClient();

  const [{ data: profile }, expediente, { data: scenarios }] = await Promise.all([
    supabase.from('profiles').select('full_name, subscription_status, email').eq('id', userId).single(),
    loadExpediente(userId),
    supabase.from('scenarios').select('*').eq('user_id', userId),
  ]);

  return { profile, expediente, scenarios };
}

export type AdvisorContext = {
  profile: { full_name?: string | null; subscription_status?: string | null; email?: string } | null;
  expediente: ExpedienteDigital | null;
  scenarios: Array<{
    name: string;
    monthly_pension: number;
    retirement_age: number;
    scenario_type: string;
    is_recommended: boolean;
    metadata?: Record<string, unknown> | null;
  }> | null;
};

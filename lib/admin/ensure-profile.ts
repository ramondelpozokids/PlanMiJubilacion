import { createServiceClient } from '@/lib/supabase/service';
import { getAdminProfile, isAdminEmail } from '@/lib/admin/config';
import { isSupabaseConfigured } from '@/lib/supabase/env';

/** Garantiza perfil admin con acceso ilimitado y gratuito. */
export async function ensureAdminProfile(userId: string, email: string | undefined) {
  if (!email || !isAdminEmail(email)) return;
  if (!isSupabaseConfigured()) return;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return;

  const admin = getAdminProfile(email);
  if (!admin) return;

  try {
    const supabase = createServiceClient();
    await supabase.from('profiles').upsert(
      {
        id: userId,
        email: admin.email,
        subscription_status: 'admin',
        subscription_plan_id: 'founder_unlimited',
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('No se pudo actualizar perfil admin:', err);
  }
}

const PLACEHOLDER_MARKERS = ['xxxxx', '...', 'your-', 'tu-'];

function isRealValue(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (normalized.length < 10) return false;
  if (PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker))) return false;
  if (normalized.startsWith('sb_publishable_')) return true;
  if (normalized.startsWith('eyj')) return true;
  return normalized.includes('supabase.co') || normalized.length >= 32;
}

export function getSupabaseAnonKey(): string | undefined {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (isRealValue(anon)) return anon;

  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (isRealValue(publishable)) return publishable;

  return undefined;
}

export function isSupabaseConfigured(): boolean {
  return (
    isRealValue(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
    Boolean(getSupabaseAnonKey())
  );
}

export function getSupabaseEnv() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase no configurado. Edita .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (Supabase → Settings → API).'
    );
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    anonKey: getSupabaseAnonKey()!,
  };
}

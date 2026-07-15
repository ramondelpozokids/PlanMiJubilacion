'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ensureAdminProfile } from '@/lib/admin/ensure-profile';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=supabase_not_configured');
  }
}

export async function signInWithEmail(formData: FormData) {
  requireSupabase();
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect('/login?error=' + encodeURIComponent(error.message));

  const { data: { user } } = await supabase.auth.getUser();
  if (user) await ensureAdminProfile(user.id, user.email);

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signInWithGoogle() {
  requireSupabase();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });
  if (error) redirect('/login?error=' + encodeURIComponent(error.message));
  if (data.url) redirect(data.url);
}

export async function signInWithApple() {
  requireSupabase();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });
  if (error) redirect('/login?error=' + encodeURIComponent(error.message));
  if (data.url) redirect(data.url);
}

export async function signOut() {
  if (!isSupabaseConfigured()) {
    redirect('/');
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
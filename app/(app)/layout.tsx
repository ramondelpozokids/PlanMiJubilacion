import { AppSidebar } from '@/components/layout/app-sidebar';
import { ChatWidget } from '@/components/features/chat-widget';
import { getProfile } from '@/lib/supabase/server';
import { getAccessLabel, hasUnlimitedAccess } from '@/lib/admin/access';
import { redirect } from 'next/navigation';

/** Rutas autenticadas: no prerenderizar en build (no hay sesión en Vercel). */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Capa SEO: el expediente nunca debe indexarse. */
export const metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const accessLabel = hasUnlimitedAccess(profile)
    ? getAccessLabel(profile)
    : undefined;
  const isFounder = hasUnlimitedAccess(profile);

  return (
    <div className="min-h-screen flex">
      <AppSidebar accessLabel={accessLabel} isFounder={isFounder} />
      <main id="main" className="flex-1 p-6 md:p-10 max-w-7xl w-full">
        {children}
      </main>
      <ChatWidget />
    </div>
  );
}

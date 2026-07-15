import { AppSidebar } from '@/components/layout/app-sidebar';
import { ChatWidget } from '@/components/features/chat-widget';
import { getProfile } from '@/lib/supabase/server';
import { getAccessLabel, hasUnlimitedAccess } from '@/lib/admin/access';
import { redirect } from 'next/navigation';

export const maxDuration = 300;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const accessLabel = hasUnlimitedAccess(profile)
    ? getAccessLabel(profile)
    : undefined;

  return (
    <div className="min-h-screen flex">
      <AppSidebar accessLabel={accessLabel} />
      <main id="main" className="flex-1 p-6 md:p-10 max-w-6xl">
        {children}
      </main>
      <ChatWidget />
    </div>
  );
}

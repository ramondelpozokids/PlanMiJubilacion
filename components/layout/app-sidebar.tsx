'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/layout/logo';
import { cn } from '@/lib/utils';
import { signOut } from '@/app/(auth)/login/actions';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/upload', label: 'Documentos' },
  { href: '/analysis', label: 'Expediente' },
  { href: '/miop', label: 'MIOP' },
  { href: '/comparator', label: 'Simulador' },
  { href: '/calendar', label: 'Calendario' },
  { href: '/settings', label: 'Ajustes' },
];

export function AppSidebar({ accessLabel }: { accessLabel?: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card p-6 min-h-screen">
      <Logo className="mb-8" />
      {accessLabel && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
          {accessLabel}
        </div>
      )}
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block rounded-md px-3 py-2 text-sm transition-colors',
              pathname === item.href || (pathname?.startsWith(item.href + '/') ?? false)
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <form action={signOut} className="mt-auto pt-6 border-t">
        <button
          type="submit"
          className="w-full text-left rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Cerrar sesión
        </button>
      </form>
    </aside>
  );
}

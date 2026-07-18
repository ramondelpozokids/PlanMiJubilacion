'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/layout/logo';
import { cn } from '@/lib/utils';
import { signOut } from '@/app/(auth)/login/actions';

/** Plan personal del fundador / usuario. */
const MY_PLAN_ITEMS = [
  { href: '/jubilacion', label: 'Jubilación' },
  { href: '/prestaciones', label: 'Prestaciones' },
  { href: '/vida-laboral', label: 'Vida laboral' },
  { href: '/futuro', label: 'Futuro' },
  { href: '/dashboard', label: 'Inicio', exact: true },
  { href: '/asesoria', label: 'Simulación guiada', exact: true },
  { href: '/asesoria/mensajes', label: 'Bandeja de contacto' },
  { href: '/settings', label: 'Ajustes' },
];

/** Solo fundador: expedientes de amigos/familiares (p. ej. Carlos). */
const FAMILY_ITEMS = [
  { href: '/asesoria/consultas', label: 'Consultas (amigos / familia)' },
];

function NavLink({
  href,
  label,
  pathname,
  exact,
}: {
  href: string;
  label: string;
  pathname: string | null;
  exact?: boolean;
}) {
  const active = exact
    ? pathname === href
    : pathname === href || (pathname?.startsWith(href + '/') ?? false);
  return (
    <Link
      href={href}
      className={cn(
        'block rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-accent/10 text-accent font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {label}
    </Link>
  );
}

function NavSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
        {title}
      </p>
      {hint && (
        <p className="mb-2 px-3 text-[10px] leading-snug text-muted-foreground/70">{hint}</p>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function AppSidebar({
  accessLabel,
  isFounder,
}: {
  accessLabel?: string;
  isFounder?: boolean;
}) {
  const pathname = usePathname();
  const inFamily =
    pathname?.startsWith('/asesoria/consultas') ||
    (pathname?.startsWith('/asesoria/') &&
      pathname !== '/asesoria' &&
      !pathname.startsWith('/asesoria/mensajes'));

  const myItems = isFounder
    ? MY_PLAN_ITEMS
    : MY_PLAN_ITEMS.filter((i) => i.href !== '/asesoria/mensajes');

  return (
    <aside className="hidden md:flex w-72 flex-col border-r bg-card p-5 min-h-screen print:hidden">
      <Logo className="mb-3 w-full max-w-[240px]" size="lg" />
      <p className="mb-6 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Ecosistema PlanMi
      </p>
      {accessLabel && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
          {accessLabel}
        </div>
      )}

      <nav className="space-y-6 flex-1">
        <NavSection
          title="Mi plan"
          hint={
            isFounder
              ? 'Solo Ramón del Pozo Rott · jubilación 2032'
              : 'Tu expediente personal'
          }
        >
          {myItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              exact={'exact' in item ? item.exact : undefined}
              pathname={pathname}
            />
          ))}
        </NavSection>

        {isFounder && (
          <NavSection
            title="Amigos y familiares"
            hint="Carlos y otros · expediente aparte"
          >
            {FAMILY_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} />
            ))}
            {inFamily && (
              <p className="mx-3 mt-2 rounded-md border border-dashed border-accent/40 bg-accent/5 px-2 py-1.5 text-[10px] leading-snug text-muted-foreground">
                Modo familiar: no estás en tu expediente personal (Ramón).
              </p>
            )}
          </NavSection>
        )}
      </nav>

      <form action={signOut} className="pt-6 border-t">
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

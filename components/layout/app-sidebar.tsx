'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/layout/logo';
import { cn } from '@/lib/utils';
import { signOut } from '@/app/(auth)/login/actions';

const SUITE_ITEMS = [
  { href: '/jubilacion', label: 'Jubilación' },
  { href: '/prestaciones', label: 'Prestaciones' },
  { href: '/vida-laboral', label: 'Vida laboral' },
  { href: '/futuro', label: 'Futuro' },
];

const TOOL_ITEMS = [
  { href: '/dashboard', label: 'Inicio' },
  { href: '/upload', label: 'Documentos' },
  { href: '/analysis', label: 'Expediente' },
  { href: '/miop', label: 'MIOP' },
  { href: '/comparator', label: 'Simulador' },
  { href: '/informes', label: 'Informes y pagos' },
  { href: '/calendar', label: 'Calendario' },
  { href: '/settings', label: 'Ajustes' },
];

function NavLink({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string | null;
}) {
  const active = pathname === href || (pathname?.startsWith(href + '/') ?? false);
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

export function AppSidebar({
  accessLabel,
  isFounder,
}: {
  accessLabel?: string;
  isFounder?: boolean;
}) {
  const pathname = usePathname();

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
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
            Productos
          </p>
          <div className="space-y-1">
            {SUITE_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
            Herramientas
          </p>
          <div className="space-y-1">
            {isFounder && (
              <>
                <NavLink href="/asesoria" label="Asesoría (gratis)" pathname={pathname} />
                <NavLink href="/asesoria/mensajes" label="Bandeja contacto" pathname={pathname} />
              </>
            )}
            {TOOL_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} pathname={pathname} />
            ))}
          </div>
        </div>
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

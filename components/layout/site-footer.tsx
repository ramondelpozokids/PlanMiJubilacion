import Link from 'next/link';

const LEGAL_LINKS = [
  { href: '/legal/aviso-legal', label: 'Aviso legal' },
  { href: '/legal/privacy', label: 'Privacidad' },
  { href: '/legal/terms', label: 'Términos' },
  { href: '/legal/cookies', label: 'Cookies' },
  { href: '/legal/mapa-del-sitio', label: 'Mapa del sitio' },
] as const;

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={`border-t py-8 print:hidden ${className ?? ''}`}>
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between text-sm text-muted-foreground">
        <div className="space-y-1">
          <p>
            © {new Date().getFullYear()} PlanMiJubilación. Reservados todos los derechos.
          </p>
          <p>
            Creador y fundador: <span className="text-foreground/80">Ramón del Pozo Rott</span>
          </p>
        </div>
        <nav aria-label="Enlaces legales" className="flex flex-wrap gap-x-4 gap-y-2">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function LegalSeeAlso({ current }: { current?: string }) {
  const links = LEGAL_LINKS.filter((l) => l.href !== current);
  return (
    <p className="not-prose text-sm text-muted-foreground mt-10 pt-6 border-t">
      Ver también:{' '}
      {links.map((l, i) => (
        <span key={l.href}>
          {i > 0 ? ' · ' : ''}
          <Link href={l.href} className="underline hover:text-foreground">
            {l.label}
          </Link>
        </span>
      ))}
    </p>
  );
}

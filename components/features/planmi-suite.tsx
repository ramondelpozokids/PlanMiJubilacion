import Link from 'next/link';
import type { ReactNode } from 'react';
import { PLANMI_PRODUCTS, PLANMI_BRAND, type PlanMiProductId } from '@/lib/planmi/products';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type PlanMiSuiteMetrics = Partial<
  Record<
    PlanMiProductId,
    {
      primary?: string;
      secondary?: string;
    }
  >
>;

export function PlanMiSuite({
  metrics,
  variant = 'app',
  loggedIn = false,
  className,
}: {
  metrics?: PlanMiSuiteMetrics;
  /** app: enlaces internos; marketing: login o producto según sesión */
  variant?: 'app' | 'marketing';
  loggedIn?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      {PLANMI_PRODUCTS.map((product, index) => {
        const m = metrics?.[product.id];
        const href =
          variant === 'marketing' && !loggedIn
            ? `/login?redirect=${encodeURIComponent(product.href)}`
            : product.href;

        return (
          <Link
            key={product.id}
            href={href}
            className={cn(
              'group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all',
              'hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              'animate-fade-up opacity-0',
              'motion-reduce:animate-none motion-reduce:opacity-100'
            )}
            style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
          >
            <div
              className={cn(
                'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80',
                product.accent
              )}
              aria-hidden
            />
            <div className="relative space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {product.status === 'activo' ? 'Disponible' : 'En expansión'}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight group-hover:underline underline-offset-4">
                    {product.name}
                  </h3>
                </div>
                <StatusPill status={product.status} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.tagline}</p>
              {(m?.primary || m?.secondary) && (
                <div className="rounded-lg border bg-background/70 px-3 py-2 backdrop-blur-sm">
                  {m.primary && (
                    <p className="text-xl font-semibold tabular-nums tracking-tight">{m.primary}</p>
                  )}
                  {m.secondary && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{m.secondary}</p>
                  )}
                </div>
              )}
              <p className="text-xs font-medium text-foreground/80 opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:opacity-100">
                Abrir →
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: 'activo' | 'expansion' }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        status === 'activo'
          ? 'border-foreground/20 bg-background text-foreground'
          : 'border-border bg-muted/50 text-muted-foreground'
      )}
    >
      {status === 'activo' ? 'Activo' : 'Próximo'}
    </span>
  );
}

export function ProductPageHeader({
  name,
  tagline,
  actions,
}: {
  name: string;
  tagline: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <nav className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">
            {PLANMI_BRAND}
          </Link>
          <span className="mx-1.5 text-border">/</span>
          <span>{name}</span>
        </nav>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{tagline}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2 print:hidden shrink-0">{actions}</div>}
    </div>
  );
}

export function EmptyProductState({
  title,
  description,
  href = '/upload',
  cta = 'Subir documentos',
}: {
  title: string;
  description: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      <Link href={href} className="inline-block mt-5">
        <Button>{cta}</Button>
      </Link>
    </div>
  );
}

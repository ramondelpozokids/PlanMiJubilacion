import { formatPriceEur } from '@/lib/billing/pricing';
import type { PricingRule } from '@/lib/international-coordination/types';
import { cn } from '@/lib/utils';

/** En portada/dashboard: estándar + internacional + premium (sin duplicar los 49,90 €). */
const PUBLIC_PRICE_KEYS = new Set([
  'informe_estandar',
  'informe_internacional',
  'informe_premium',
]);

export function PricingTable({
  pricing,
  variant = 'app',
  className,
}: {
  pricing: PricingRule[];
  /** app = dashboard/informes · marketing = página pública */
  variant?: 'app' | 'marketing';
  className?: string;
}) {
  const isMarketing = variant === 'marketing';
  const rows = pricing.filter((p) => PUBLIC_PRICE_KEYS.has(p.serviceKey));

  return (
    <section
      className={cn(
        'rounded-xl border p-5 sm:p-6',
        isMarketing && 'bg-card/60',
        className
      )}
    >
      <div className={isMarketing ? 'max-w-2xl' : undefined}>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Tarifas
        </p>
        <h2
          className={cn(
            'mt-1 font-semibold tracking-tight',
            isMarketing ? 'text-2xl md:text-3xl' : 'text-lg'
          )}
        >
          Tabla de precios
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Precio cerrado. IVA incluido en el importe mostrado.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No hay tarifas activas.</p>
      ) : (
        <ul className="mt-6 divide-y text-sm">
          {rows.map((p) => (
            <li
              key={p.serviceKey}
              className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 max-w-xl">
                <p className="font-medium">{p.label}</p>
                <p className="mt-1 text-muted-foreground leading-relaxed">{p.description}</p>
              </div>
              <span className="shrink-0 text-lg font-semibold tabular-nums tracking-tight">
                {formatPriceEur(p.priceCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
